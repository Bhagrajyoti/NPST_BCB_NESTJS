import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BillPayment } from './entities/bill-payment.entity';
import { MockBill } from '../bill/entities/mock-bill.entity';
import { DemoBbpsData } from '../demo/entities/demo-bbps-data.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BbpsAdapter } from './adapter/bbps.adapter';

type BillingRecord =
  | { source: 'mock'; record: MockBill }
  | { source: 'demo'; record: DemoBbpsData };

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(BillPayment)
    private readonly paymentRepository: Repository<BillPayment>,

    @InjectRepository(MockBill)
    private readonly mockBillRepository: Repository<MockBill>,

    @InjectRepository(DemoBbpsData)
    private readonly demoRepository: Repository<DemoBbpsData>,

    @Inject('BBPS_ADAPTER')
    private readonly bbpsAdapter: BbpsAdapter,
  ) {}

  // demo_bbps_data is a fallback, checked only when billerCode+consumerNumber aren't in
  // mock_bill — see demo/entities/demo-bbps-data.entity.ts for why it's a separate table.
  private async findBillingRecord(
    billerCode: string,
    consumerNumber: string,
  ): Promise<BillingRecord | null> {
    const mock = await this.mockBillRepository.findOne({ where: { billerCode, consumerNumber } });
    if (mock) {
      return { source: 'mock', record: mock };
    }

    const demo = await this.demoRepository.findOne({ where: { billerCode, consumerNumber } });
    if (demo) {
      return { source: 'demo', record: demo };
    }

    return null;
  }

  findAll() {
    return this.paymentRepository.find();
  }

  findOne(id: string) {
    return this.paymentRepository.findOne({
      where: { id },
    });
  }

  async create(dto: CreatePaymentDto) {
    
    // 0. Idempotency check
  const existingPayment = await this.paymentRepository.findOne({
    where: {
      idempotencyKey: dto.idempotencyKey,
    },
  });

  if (existingPayment) {
  const sameRequest =
    existingPayment.billerCode === dto.billerCode &&
    existingPayment.consumerNumber === dto.consumerNumber &&
    Number(existingPayment.amount) === Number(dto.amount);

  if (!sameRequest) {
    throw new BadRequestException({
      code: 'IDEMPOTENCY_KEY_REUSED',
      message: 'Idempotency key is already used for a different payment',
    });
  }

  return {
    paymentId: existingPayment.id,
    billerCode: existingPayment.billerCode,
    consumerNumber: existingPayment.consumerNumber,
    amount: existingPayment.amount,
    status: existingPayment.status,
    bbpsReferenceId: existingPayment.bbpsReferenceId,
    duplicate: true,
  };
}

    // 1. Find bill
    const found = await this.findBillingRecord(dto.billerCode, dto.consumerNumber);

    if (!found) {
      throw new NotFoundException({
        code: 'BILL_NOT_FOUND',
        message: 'Bill not found',
      });
    }

    const { record: bill, source } = found;

    // 2. Check bill status
    if (bill.status !== 'UNPAID') {
      throw new BadRequestException({
        code: 'BILL_NOT_PAYABLE',
        message: 'Bill is already paid or not payable',
      });
    }

    // 3. Verify amount
    const requestedAmount = Number(dto.amount);
    const billAmount = Number(bill.amount);

    if (
      Number.isNaN(requestedAmount) ||
      requestedAmount !== billAmount
    ) {
      throw new BadRequestException({
        code: 'AMOUNT_MISMATCH',
        message: 'Payment amount does not match bill amount',
      });
    }

    // 4. Call Mock BBPS
    const bbpsResponse = await this.bbpsAdapter.pay({
      billerCode: bill.billerCode,
      consumerNumber: bill.consumerNumber,
      amount: billAmount,
    });

    // 5. Create payment record
    const payment = this.paymentRepository.create({
      billerCode: bill.billerCode,
      consumerNumber: bill.consumerNumber,
      amount: billAmount,
      status: bbpsResponse.status,
      idempotencyKey: dto.idempotencyKey,
      bbpsReferenceId: bbpsResponse.referenceId,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // 6. Only SUCCESS marks bill as PAID
    if (bbpsResponse.status === 'SUCCESS') {
      bill.status = 'PAID';
      if (source === 'mock') {
        await this.mockBillRepository.save(bill);
      } else {
        await this.demoRepository.save(bill);
      }
    }

    // 7. Return payment result
    return {
      paymentId: savedPayment.id,
      billerCode: savedPayment.billerCode,
      consumerNumber: savedPayment.consumerNumber,
      amount: savedPayment.amount,
      status: savedPayment.status,
      bbpsReferenceId: savedPayment.bbpsReferenceId,
    };
  }

  /**
   * Re-dispatches a non-final payment (e.g. one left PENDING/TIMEOUT by a prior attempt) to
   * BBPS and updates its status. Goes through the same `bbpsAdapter` seam `create()` uses
   * (the DI-injected 'BBPS_ADAPTER' token, currently MockBbpsAdapter) rather than a separate
   * CbsClient call — there's no real BBPS/CBS base URL configured anywhere in this service
   * yet (see cbs.client.ts), so routing through a second, equally-unconfigured HTTP client
   * would not be any more "real" than reusing the adapter this module already standardizes
   * on; swap MockBbpsAdapter for a real implementation of the same BbpsAdapter interface
   * once a live BBPS/CBS endpoint exists.
   */
  async payViaBbps(billPaymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({ where: { id: billPaymentId } });
    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Bill payment not found' });
    }

    if (payment.status === 'SUCCESS') {
      return;
    }

    const bbpsResponse = await this.bbpsAdapter.pay({
      billerCode: payment.billerCode,
      consumerNumber: payment.consumerNumber,
      amount: Number(payment.amount),
    });

    payment.status = bbpsResponse.status;
    payment.bbpsReferenceId = bbpsResponse.referenceId ?? payment.bbpsReferenceId;
    await this.paymentRepository.save(payment);

    if (bbpsResponse.status === 'SUCCESS') {
      const found = await this.findBillingRecord(payment.billerCode, payment.consumerNumber);
      if (found) {
        found.record.status = 'PAID';
        if (found.source === 'mock') {
          await this.mockBillRepository.save(found.record);
        } else {
          await this.demoRepository.save(found.record);
        }
      }
    }
  }
}