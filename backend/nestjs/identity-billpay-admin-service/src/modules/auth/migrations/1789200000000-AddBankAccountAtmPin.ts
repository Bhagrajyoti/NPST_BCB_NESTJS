import { MigrationInterface, QueryRunner } from 'typeorm';

// Backs `atmPinHash` on BankAccount — POST /auth/registration/set-atm-pin writes it (scrypt
// hash only, never plaintext), verify-atm-pin reads it. Both are a step customers complete
// before /auth/registration/activate-mobile.
export class AddBankAccountAtmPin1789200000000 implements MigrationInterface {
  name = 'AddBankAccountAtmPin1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`bank_account\`
      ADD \`atm_pin_hash\` varchar(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`bank_account\`
      DROP COLUMN \`atm_pin_hash\`
    `);
  }
}
