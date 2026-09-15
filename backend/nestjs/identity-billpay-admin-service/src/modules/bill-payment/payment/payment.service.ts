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
import {
  assertIdempotentPaymentOwnedByActor,
  assertPaymentOwnedByActor,
  canViewAllBillPayments,
  requireActorSub,
} from '../common/bbps-access.util';

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
  private async findBillingRecordByBillNumber(
    billNumber: string,
  ): Promise<BillingRecord | null> {
    const mock = await this.mockBillRepository.findOne({ where: { billNumber } });
    if (mock) {
      return { source: 'mock', record: mock };
    }

    const demo = await this.demoRepository.findOne({ where: { billNumber } });
    if (demo) {
      return { source: 'demo', record: demo };
    }

    return null;
  }

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

  findAll(actor: Record<string, unknown>) {
    if (canViewAllBillPayments(actor)) {
      return this.paymentRepository.find();
    }
    const sub = requireActorSub(actor);
    return this.paymentRepository.find({ where: { keycloakUserId: sub } });
  }

  async findOne(id: string, actor: Record<string, unknown>) {
    const payment = await this.paymentRepository.findOne({
      where: { id },
    });
    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Bill payment not found',
      });
    }
    assertPaymentOwnedByActor(payment, actor);
    return payment;
  }

  async create(dto: CreatePaymentDto, actor: Record<string, unknown>) {
    const keycloakUserId = requireActorSub(actor);
    if (!dto.billNumber && (!dto.billerCode || !dto.consumerNumber || !dto.amount)) {
      throw new BadRequestException({
        code: 'INVALID_PAYMENT_REQUEST',
        message:
          'Provide billNumber from fetch, or billerCode + consumerNumber + amount together',
      });
    }

    // 0. Idempotency check
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        idempotencyKey: dto.idempotencyKey!,
      },
    });

    if (existingPayment) {
      assertIdempotentPaymentOwnedByActor(existingPayment, actor);
      const sameRequest = await this.isSamePaymentRequest(dto, existingPayment);

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
    const found = dto.billNumber
      ? await this.findBillingRecordByBillNumber(dto.billNumber)
      : await this.findBillingRecord(dto.billerCode!, dto.consumerNumber!);

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
    const billAmount = Number(bill.amount);
    const requestedAmount =
      dto.amount != null && dto.amount !== '' ? Number(dto.amount) : billAmount;

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
      idempotencyKey: dto.idempotencyKey!,
      keycloakUserId,
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
      billNumber: bill.billNumber,
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
  private async isSamePaymentRequest(
    dto: CreatePaymentDto,
    existingPayment: BillPayment,
  ): Promise<boolean> {
    if (dto.billNumber) {
      const found = await this.findBillingRecordByBillNumber(dto.billNumber);
      if (!found) {
        return false;
      }
      const bill = found.record;
      return (
        existingPayment.billerCode === bill.billerCode &&
        existingPayment.consumerNumber === bill.consumerNumber &&
        Number(existingPayment.amount) === Number(bill.amount)
      );
    }

    return (
      existingPayment.billerCode === dto.billerCode &&
      existingPayment.consumerNumber === dto.consumerNumber &&
      Number(existingPayment.amount) === Number(dto.amount)
    );
  }

  async payViaBbps(billPaymentId: string, actor: Record<string, unknown>): Promise<void> {
    const payment = await this.paymentRepository.findOne({ where: { id: billPaymentId } });
    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Bill payment not found' });
    }

    assertPaymentOwnedByActor(payment, actor);

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