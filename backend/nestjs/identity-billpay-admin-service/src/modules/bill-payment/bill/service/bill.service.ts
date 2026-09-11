import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MockBill } from '../entities/mock-bill.entity';
import { BillerRegistration } from '../../biller/entities/biller-registration.entity';
import { DemoBbpsData } from '../../demo/entities/demo-bbps-data.entity';
import { FetchBillDto } from '../dto/fetch-bill.dto';

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(MockBill)
    private readonly mockBillRepository: Repository<MockBill>,

    @InjectRepository(BillerRegistration)
    private readonly billerRepository: Repository<BillerRegistration>,

    @InjectRepository(DemoBbpsData)
    private readonly demoRepository: Repository<DemoBbpsData>,
  ) {}

  async fetchBill(dto: FetchBillDto) {
    const biller = await this.billerRepository.findOne({
      where: {
        billerCode: dto.billerCode,
        active: true,
      },
    });

    if (biller) {
      const bill = await this.mockBillRepository.findOne({
        where: {
          billerCode: dto.billerCode,
          consumerNumber: dto.consumerNumber,
          registeredMobile: dto.registeredMobile,
        },
      });

      if (bill) {
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

    // Fall back to the fixed demo_bbps_data rows (see demo/) — always-clean fixtures for
    // manual/Swagger testing, independent of biller_registration/mock_bill.
    const demo = await this.demoRepository.findOne({
      where: {
        billerCode: dto.billerCode,
        consumerNumber: dto.consumerNumber,
        registeredMobile: dto.registeredMobile,
      },
    });

    if (!demo) {
      throw new NotFoundException({
        code: 'BILL_NOT_FOUND',
        message: 'Bill not found',
      });
    }

    return {
      billerCode: demo.billerCode,
      billerName: demo.billerName,
      consumerNumber: demo.consumerNumber,
      billNumber: demo.billNumber,
      customerName: demo.customerName,
      registeredMobile: demo.registeredMobile,
      amount: demo.amount,
      dueDate: demo.dueDate,
      status: demo.status,
    };
  }
}