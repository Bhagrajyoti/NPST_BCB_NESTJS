import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { hashPin } from '../../../common/utils/pin-hash.util';

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
    // Pre-set to "1234" so POST /auth/registration/verify-atm-pin has something to test
    // against immediately, without calling set-atm-pin first.
    atmPinHash: hashPin('1234'),
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
    atmPinHash: hashPin('5678'),
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
    atmPinHash: hashPin('4321'),
  },
  {
    mobileNumber: '9123456789',
    accountNumber: '40056789012345',
    accountHolderName: 'Priya Sharma',
    accountType: 'SAVINGS',
    bankName: 'Axis Bank',
    branchName: 'Bandra West, Mumbai',
    ifscCode: 'UTIB0000456',
    debitCardNumber: '5425233430109903',
    debitCardCvv: '321',
    debitCardExpiry: '06/30',
    status: 'ACTIVE',
    atmPinHash: hashPin('2580'),
  },
  {
    mobileNumber: '9988776655',
    accountNumber: '50067890123456',
    accountHolderName: 'Amit Patel',
    accountType: 'CURRENT',
    bankName: 'Kotak Mahindra Bank',
    branchName: 'Ahmedabad Main',
    ifscCode: 'KKBK0000958',
    debitCardNumber: '378282246310005',
    debitCardCvv: '654',
    debitCardExpiry: '01/29',
    status: 'ACTIVE',
    atmPinHash: null,
  },
  {
    mobileNumber: '9988776655',
    accountNumber: '50067890123457',
    accountHolderName: 'Amit Patel',
    accountType: 'SAVINGS',
    bankName: 'Punjab National Bank',
    branchName: 'Satellite, Ahmedabad',
    ifscCode: 'PUNB0123456',
    debitCardNumber: '6011000990139424',
    debitCardCvv: '111',
    debitCardExpiry: '12/28',
    status: 'ACTIVE',
    atmPinHash: hashPin('9876'),
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
