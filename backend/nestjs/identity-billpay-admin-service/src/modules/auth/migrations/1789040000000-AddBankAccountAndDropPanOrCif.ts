import { MigrationInterface, QueryRunner } from 'typeorm';

// Registration now looks up accounts by mobile number alone (see RegistrationService.create()
// and BankAccountService) instead of asking the customer for a PAN/CIF up front — so
// `registration_attempt.pan_or_cif` is dropped, and `bank_account` (mock CBS data, seeded by
// BankAccountSeeder) is added to back the lookup.
export class AddBankAccountAndDropPanOrCif1789040000000 implements MigrationInterface {
  name = 'AddBankAccountAndDropPanOrCif1789040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`registration_attempt\`
      DROP COLUMN \`pan_or_cif\`
    `);

    await queryRunner.query(`
      CREATE TABLE \`bank_account\` (
        \`id\` varchar(36) NOT NULL,
        \`mobile_number\` varchar(255) NOT NULL,
        \`account_number\` varchar(255) NOT NULL,
        \`account_holder_name\` varchar(255) NOT NULL,
        \`account_type\` varchar(255) NOT NULL DEFAULT 'SAVINGS',
        \`bank_name\` varchar(255) NOT NULL,
        \`branch_name\` varchar(255) NOT NULL,
        \`ifsc_code\` varchar(255) NOT NULL,
        \`debit_card_number\` varchar(255) NOT NULL,
        \`debit_card_cvv\` varchar(255) NOT NULL,
        \`debit_card_expiry\` varchar(255) NOT NULL,
        \`status\` varchar(255) NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_bank_account_mobile_number\` (\`mobile_number\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`bank_account\``);

    await queryRunner.query(`
      ALTER TABLE \`registration_attempt\`
      ADD \`pan_or_cif\` varchar(255) NOT NULL DEFAULT ''
    `);
  }
}
