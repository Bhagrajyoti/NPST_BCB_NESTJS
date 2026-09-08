import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BillPayment } from './entities/bill-payment.entity';
import { MockBill } from '../bill/entities/mock-bill.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(BillPayment)
    private readonly paymentRepository: Repository<BillPayment>,

    @InjectRepository(MockBill)
    private readonly mockBillRepository: Repository<MockBill>,
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
    // 1. Find the bill
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

    // 4. Create payment record
    const payment = this.paymentRepository.create({
      billerCode: bill.billerCode,
      consumerNumber: bill.consumerNumber,
      amount: billAmount,
      status: 'SUCCESS',
      bbpsReferenceId: `BBPS-${Date.now()}`,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // 5. Mark mock bill as paid
    bill.status = 'PAID';
    await this.mockBillRepository.save(bill);

    // 6. Return payment result
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