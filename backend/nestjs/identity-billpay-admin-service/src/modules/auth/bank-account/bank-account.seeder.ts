import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';

const DEMO_ROWS: Array<Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    mobileNumber: '9876543210',
    accountNumber: '10023456789012',
    accountHolderName: 'Ravi Kumar',
    accountType: 'SAVINGS',
    bankName: 'ICICI Bank',
    branchName: 'MG Road, Bengaluru',
    ifscCode: 'ICIC0001234',
    debitCardNumber: '4111111111111111',
    debitCardCvv: '123',
    debitCardExpiry: '09/28',
    status: 'ACTIVE',
  },
  {
    mobileNumber: '9876543210',
    accountNumber: '20034567890123',
    accountHolderName: 'Ravi Kumar',
    accountType: 'CURRENT',
    bankName: 'HDFC Bank',
    branchName: 'Koramangala, Bengaluru',
    ifscCode: 'HDFC0000123',
    debitCardNumber: '5500005555555559',
    debitCardCvv: '456',
    debitCardExpiry: '03/27',
    status: 'ACTIVE',
  },
  {
    mobileNumber: '9000000001',
    accountNumber: '30045678901234',
    accountHolderName: 'Demo Customer One',
    accountType: 'SAVINGS',
    bankName: 'State Bank of India',
    branchName: 'Connaught Place, New Delhi',
    ifscCode: 'SBIN0001234',
    debitCardNumber: '4012888888881881',
    debitCardCvv: '789',
    debitCardExpiry: '11/29',
    status: 'ACTIVE',
  },
];

/**
 * Idempotently (re)inserts the fixed demo rows above on every boot — same pattern as
 * DemoBbpsDataSeeder (src/modules/bill-payment/demo). Stands in for a real CBS "list accounts
 * by mobile number" lookup so POST /auth/registration/create has something to resolve against
 * without a live core-banking integration — see mock-testing-guide.md.
 */
@Injectable()
export class BankAccountSeeder implements OnModuleInit {
  private readonly logger = new Logger(BankAccountSeeder.name);

  constructor(
    @InjectRepository(BankAccount)
    private readonly repository: Repository<BankAccount>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const row of DEMO_ROWS) {
      const existing = await this.repository.findOne({
        where: { mobileNumber: row.mobileNumber, accountNumber: row.accountNumber },
      });
      if (!existing) {
        await this.repository.save(this.repository.create(row));
      }
    }
    this.logger.log(`bank_account ready (${DEMO_ROWS.length} fixed rows)`);
  }
}
