import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DemoBbpsData } from './entities/demo-bbps-data.entity';

const DEMO_ROWS: Array<Omit<DemoBbpsData, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    billerCode: 'DEMO-ELEC-001',
    billerName: 'Demo Electricity Board',
    category: 'ELECTRICITY',
    consumerNumber: '100000000001',
    billNumber: 'DEMO-BILL-ELEC-001',
    registeredMobile: '9000000001',
    customerName: 'Demo Customer One',
    amount: 1250.5,
    dueDate: '2026-12-31',
    status: 'UNPAID',
  },
  {
    billerCode: 'DEMO-WATER-001',
    billerName: 'Demo Water Board',
    category: 'WATER',
    consumerNumber: '100000000002',
    billNumber: 'DEMO-BILL-WATER-001',
    registeredMobile: '9000000002',
    customerName: 'Demo Customer Two',
    amount: 480,
    dueDate: '2026-12-31',
    status: 'UNPAID',
  },
  {
    billerCode: 'DEMO-GAS-001',
    billerName: 'Demo Gas Agency',
    category: 'GAS',
    consumerNumber: '100000000003',
    billNumber: 'DEMO-BILL-GAS-001',
    registeredMobile: '9000000003',
    customerName: 'Demo Customer Three',
    amount: 900,
    dueDate: '2026-12-31',
    status: 'UNPAID',
  },
];

/**
 * Idempotently (re)inserts the fixed demo rows above on every boot, so `demo_bbps_data`
 * is always populated without a separate seed command — restart the app and it's there.
 */
@Injectable()
export class DemoBbpsDataSeeder implements OnModuleInit {
  private readonly logger = new Logger(DemoBbpsDataSeeder.name);

  constructor(
    @InjectRepository(DemoBbpsData)
    private readonly repository: Repository<DemoBbpsData>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const row of DEMO_ROWS) {
      const existing = await this.repository.findOne({
        where: { billerCode: row.billerCode, consumerNumber: row.consumerNumber },
      });
      if (!existing) {
        await this.repository.save(this.repository.create(row));
      }
    }
    this.logger.log(`demo_bbps_data ready (${DEMO_ROWS.length} fixed rows)`);
  }
}
