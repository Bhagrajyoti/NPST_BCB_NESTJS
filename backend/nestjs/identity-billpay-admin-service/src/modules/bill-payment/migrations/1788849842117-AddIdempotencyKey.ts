import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdempotencyKey1788849842117 implements MigrationInterface {
  name = 'AddIdempotencyKey1788849842117';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add column as nullable because existing payment records already exist
    await queryRunner.query(`
      ALTER TABLE \`bill_payment\`
      ADD \`idempotency_key\` varchar(255) NULL
    `);

    // 2. Generate unique keys for existing records
    await queryRunner.query(`
      UPDATE \`bill_payment\`
      SET \`idempotency_key\` = CONCAT('LEGACY-', \`id\`)
      WHERE \`idempotency_key\` IS NULL
    `);

    // 3. Make column mandatory
    await queryRunner.query(`
      ALTER TABLE \`bill_payment\`
      MODIFY \`idempotency_key\` varchar(255) NOT NULL
    `);

    // 4. Add unique constraint
    await queryRunner.query(`
      ALTER TABLE \`bill_payment\`
      ADD UNIQUE INDEX \`IDX_00102e14a962999378bb9949f4\`
      (\`idempotency_key\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`bill_payment\`
      DROP INDEX \`IDX_00102e14a962999378bb9949f4\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`bill_payment\`
      DROP COLUMN \`idempotency_key\`
    `);
  }
}