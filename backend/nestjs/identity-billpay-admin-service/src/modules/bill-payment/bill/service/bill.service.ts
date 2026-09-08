import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MockBill } from '../entities/mock-bill.entity';
import { BillerRegistration } from '../../biller/entities/biller-registration.entity';
import { FetchBillDto } from '../dto/fetch-bill.dto';

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(MockBill)
    private readonly mockBillRepository: Repository<MockBill>,

    @InjectRepository(BillerRegistration)
    private readonly billerRepository: Repository<BillerRegistration>,
  ) {}

  async fetchBill(dto: FetchBillDto) {
    const biller = await this.billerRepository.findOne({
      where: {
        billerCode: dto.billerCode,
        active: true,
      },
    });

    if (!biller) {
      throw new NotFoundException({
        code: 'BILLER_NOT_FOUND',
        message: 'Biller not found',
      });
    }

    const bill = await this.mockBillRepository.findOne({
      where: {
        billerCode: dto.billerCode,
        consumerNumber: dto.consumerNumber,
        registeredMobile: dto.registeredMobile,
      },
    });

    if (!bill) {
      throw new NotFoundException({
        code: 'BILL_NOT_FOUND',
        message: 'Bill not found',
      });
    }

    return {
      billerCode: bill.billerCode,
      billerName: biller.billerName,
      consumerNumber: bill.consumerNumber,
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      registeredMobile: bill.registeredMobile,
      amount: bill.amount,
      dueDate: bill.dueDate,
      status: bill.status,
    };
  }
}