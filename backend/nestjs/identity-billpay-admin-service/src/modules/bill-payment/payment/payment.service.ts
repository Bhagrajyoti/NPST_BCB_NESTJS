import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillPayment } from './entities/bill-payment.entity';

// BBPS integration: initiates and reconciles bill payments.
@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(BillPayment)
    private readonly repository: Repository<BillPayment>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  async create(data: Partial<BillPayment>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async payViaBbps(_billPaymentId: string): Promise<void> {
    // TODO: call BBPS via the resilient HTTP client factory
    throw new Error('Not implemented');
  }
}
