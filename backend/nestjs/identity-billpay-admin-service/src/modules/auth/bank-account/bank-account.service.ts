import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';

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

export interface VerifyDebitCardInput {
  mobileNumber: string;
  accountNumber: string;
  debitCardNumber: string;
  debitCardExpiry: string;
  debitCardCvv: string;
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
    const account = await this.repository.findOne({
      where: { mobileNumber: input.mobileNumber, accountNumber: input.accountNumber },
    });

    if (!account) {
      throw new NotFoundException('No account found for this mobile number and account number');
    }

    const matches =
      account.debitCardNumber === input.debitCardNumber &&
      account.debitCardExpiry === input.debitCardExpiry &&
      account.debitCardCvv === input.debitCardCvv;

    if (!matches) {
      throw new BadRequestException('Debit card details do not match this account');
    }

    return toSummary(account);
  }
}
