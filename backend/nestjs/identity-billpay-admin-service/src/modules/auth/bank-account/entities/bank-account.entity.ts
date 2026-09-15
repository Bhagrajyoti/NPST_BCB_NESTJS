import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Mock CBS account data, keyed by registered mobile number — stands in for a real core-banking
 * lookup so `POST /auth/registration/create` can resolve "which accounts does this mobile number
 * own" without a live CBS integration. Seeded by BankAccountSeeder — see mock-testing-guide.md.
 */
@Entity({ name: 'bank_account' })
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'mobile_number' })
  mobileNumber: string;

  @Column({ name: 'account_number' })
  accountNumber: string;

  @Column({ name: 'account_holder_name' })
  accountHolderName: string;

  @Column({ name: 'account_type', default: 'SAVINGS' })
  accountType: string;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ name: 'branch_name' })
  branchName: string;

  @Column({ name: 'ifsc_code' })
  ifscCode: string;

  @Column({ name: 'debit_card_number' })
  debitCardNumber: string;

  @Column({ name: 'debit_card_cvv' })
  debitCardCvv: string;

  // MM/YY, matching how a physical card prints it.
  @Column({ name: 'debit_card_expiry' })
  debitCardExpiry: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  // Hashed (scrypt, see mpin-hash.util.ts) — never the plaintext PIN. Null until
  // POST /auth/registration/set-atm-pin is called for this account.
  @Column({ name: 'atm_pin_hash', type: 'varchar', length: 255, nullable: true })
  atmPinHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
