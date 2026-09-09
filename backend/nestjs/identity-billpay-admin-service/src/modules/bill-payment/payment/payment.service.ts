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
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BbpsAdapter } from './adapter/bbps.adapter';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(BillPayment)
    private readonly paymentRepository: Repository<BillPayment>,

    @InjectRepository(MockBill)
    private readonly mockBillRepository: Repository<MockBill>,

    @Inject('BBPS_ADAPTER')
    private readonly bbpsAdapter: BbpsAdapter,
  ) {}

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
    const bill = await this.mockBillRepository.findOne({
      where: {
        billerCode: dto.billerCode,
        consumerNumber: dto.consumerNumber,
      },
    });

    if (!bill) {
      throw new NotFoundException({
        code: 'BILL_NOT_FOUND',
        message: 'Bill not found',
      });
    }

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
      await this.mockBillRepository.save(bill);
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

  async payViaBbps(_billPaymentId: string): Promise<void> {
    // Real BBPS integration will be added later.
    throw new Error('Not implemented');
  }
}