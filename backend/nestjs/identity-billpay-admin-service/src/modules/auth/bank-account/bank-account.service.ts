import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { hashPin, verifyPin } from '../../../common/utils/pin-hash.util';

export interface RegisteredAccountSummary {
  accountNumber: string;
  accountHolderName: string;
  accountType: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  debitCardNumber: string;
  debitCardExpiry: string;
  status: string;
}

export interface CustomerSummary extends RegisteredAccountSummary {
  mobileNumber: string;
}

export interface VerifyDebitCardInput {
  mobileNumber: string;
  accountNumber: string;
  debitCardNumber: string;
  debitCardExpiry: string;
  debitCardCvv: string;
}

export interface AtmPinInput {
  mobileNumber: string;
  accountNumber: string;
  atmPin: string;
}

function toSummary(account: BankAccount): RegisteredAccountSummary {
  return {
    accountNumber: account.accountNumber,
    accountHolderName: account.accountHolderName,
    accountType: account.accountType,
    bankName: account.bankName,
    branchName: account.branchName,
    ifscCode: account.ifscCode,
    debitCardNumber: account.debitCardNumber,
    debitCardExpiry: account.debitCardExpiry,
    status: account.status,
  };
}

@Injectable()
export class BankAccountService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly repository: Repository<BankAccount>,
  ) {}

  /** Every mock customer/bank-account record on file — backs the public "list all customers" lookup. */
  async findAll(): Promise<CustomerSummary[]> {
    const accounts = await this.repository.find({
      order: { mobileNumber: 'ASC', createdAt: 'ASC' },
    });
    return accounts.map((account) => ({ mobileNumber: account.mobileNumber, ...toSummary(account) }));
  }

  async findByMobileNumber(mobileNumber: string): Promise<RegisteredAccountSummary[]> {
    const accounts = await this.repository.find({
      where: { mobileNumber },
      order: { createdAt: 'ASC' },
    });
    return accounts.map(toSummary);
  }

  /**
   * Mock "activate mobile" check: the debit card number/expiry/CVV sent in must match the
   * card on file for `accountNumber` *and* that account must actually belong to
   * `mobileNumber` — proving the caller both owns the mobile number (already OTP-verified
   * earlier in the registration saga) and holds the physical card for the account they're
   * claiming, the same way a real "activate via debit card" flow would.
   */
  async verifyDebitCard(input: VerifyDebitCardInput): Promise<RegisteredAccountSummary> {
    const account = await this.findAccountOrThrow(input.mobileNumber, input.accountNumber);

    const matches =
      account.debitCardNumber === input.debitCardNumber &&
      account.debitCardExpiry === input.debitCardExpiry &&
      account.debitCardCvv === input.debitCardCvv;

    if (!matches) {
      throw new BadRequestException('Debit card details do not match this account');
    }

    return toSummary(account);
  }

  /**
   * Sets (or replaces) the ATM PIN for an account — a step customers complete before
   * POST /auth/registration/activate-mobile. Only the scrypt hash is ever persisted.
   */
  async setAtmPin(input: AtmPinInput): Promise<void> {
    const account = await this.findAccountOrThrow(input.mobileNumber, input.accountNumber);
    account.atmPinHash = hashPin(input.atmPin);
    await this.repository.save(account);
  }

  /** Verifies a submitted ATM PIN against the hash set via setAtmPin(). */
  async verifyAtmPin(input: AtmPinInput): Promise<boolean> {
    const account = await this.findAccountOrThrow(input.mobileNumber, input.accountNumber);
    if (!account.atmPinHash) {
      throw new BadRequestException(
        'No ATM PIN set for this account yet — call POST /auth/registration/set-atm-pin first',
      );
    }
    return verifyPin(input.atmPin, account.atmPinHash);
  }

  private async findAccountOrThrow(mobileNumber: string, accountNumber: string): Promise<BankAccount> {
    const account = await this.repository.findOne({ where: { mobileNumber, accountNumber } });
    if (!account) {
      throw new NotFoundException('No account found for this mobile number and account number');
    }
    return account;
  }
}
