import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BBPS_CATALOG } from './bbps-catalog.const';
import { BillerRegistration } from '../biller/entities/biller-registration.entity';
import { MockBill } from '../bill/entities/mock-bill.entity';
import { DemoBbpsData } from '../demo/entities/demo-bbps-data.entity';

@Injectable()
export class BbpsCatalogSeeder implements OnModuleInit {
  private readonly logger = new Logger(BbpsCatalogSeeder.name);

  constructor(
    @InjectRepository(BillerRegistration)
    private readonly billerRepository: Repository<BillerRegistration>,
    @InjectRepository(MockBill)
    private readonly mockBillRepository: Repository<MockBill>,
    @InjectRepository(DemoBbpsData)
    private readonly demoRepository: Repository<DemoBbpsData>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const row of BBPS_CATALOG) {
      await this.upsertBiller(row);
      await this.upsertMockBill(row);
      await this.upsertDemo(row);
    }
    this.logger.log(
      `BBPS catalog ready (${BBPS_CATALOG.length} billers — 2 each for ELECTRICITY, GAS, WATER)`,
    );
  }

  private async upsertBiller(row: (typeof BBPS_CATALOG)[number]): Promise<void> {
    const existing = await this.billerRepository.findOne({
      where: { billerCode: row.billerCode },
    });
    if (existing) {
      existing.billerName = row.billerName;
      existing.category = row.category;
      existing.active = true;
      await this.billerRepository.save(existing);
      return;
    }
    await this.billerRepository.save(
      this.billerRepository.create({
        billerCode: row.billerCode,
        billerName: row.billerName,
        category: row.category,
        active: true,
      }),
    );
  }

  private async upsertMockBill(row: (typeof BBPS_CATALOG)[number]): Promise<void> {
    const existing = await this.mockBillRepository.findOne({
      where: { billerCode: row.billerCode, consumerNumber: row.consumerNumber },
    });
    const payload = {
      billerCode: row.billerCode,
      consumerNumber: row.consumerNumber,
      billNumber: row.billNumber,
      registeredMobile: row.registeredMobile,
      customerName: row.customerName,
      amount: row.amount,
      dueDate: row.dueDate,
      status: existing?.status === 'PAID' ? 'PAID' : 'UNPAID',
    };
    if (existing) {
      Object.assign(existing, payload);
      await this.mockBillRepository.save(existing);
      return;
    }
    await this.mockBillRepository.save(this.mockBillRepository.create(payload));
  }

  private async upsertDemo(row: (typeof BBPS_CATALOG)[number]): Promise<void> {
    const existing = await this.demoRepository.findOne({
      where: { billerCode: row.billerCode, consumerNumber: row.consumerNumber },
    });
    const payload = {
      billerCode: row.billerCode,
      billerName: row.billerName,
      category: row.category,
      consumerNumber: row.consumerNumber,
      billNumber: row.billNumber,
      registeredMobile: row.registeredMobile,
      customerName: row.customerName,
      amount: row.amount,
      dueDate: row.dueDate,
      status: existing?.status === 'PAID' ? 'PAID' : 'UNPAID',
    };
    if (existing) {
      Object.assign(existing, payload);
      await this.demoRepository.save(existing);
      return;
    }
    await this.demoRepository.save(this.demoRepository.create(payload));
  }
}
