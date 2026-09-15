import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleStatusAndExecution1788852000000 implements MigrationInterface {
  name = 'AddScheduleStatusAndExecution1788852000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`bill_schedule\`
      ADD \`status\` varchar(32) NOT NULL DEFAULT 'ACTIVE'
    `);
    await queryRunner.query(`
      UPDATE \`bill_schedule\`
      SET \`status\` = IF(\`active\` = 1, 'ACTIVE', 'PAUSED')
    `);

    await queryRunner.query(`
      CREATE TABLE \`bill_schedule_execution\` (
        \`id\` varchar(36) NOT NULL,
        \`schedule_id\` varchar(36) NOT NULL,
        \`bill_number\` varchar(255) NULL,
        \`bill_amount\` decimal(12,2) NULL,
        \`maximum_amount\` decimal(12,2) NULL,
        \`idempotency_key\` varchar(255) NULL,
        \`status\` varchar(32) NOT NULL,
        \`attempt_count\` int NOT NULL DEFAULT 1,
        \`failure_reason\` varchar(512) NULL,
        \`payment_id\` varchar(36) NULL,
        \`started_at\` datetime NULL,
        \`completed_at\` datetime NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_bill_schedule_execution_schedule_created\` (\`schedule_id\`, \`created_at\`),
        CONSTRAINT \`FK_bill_schedule_execution_schedule\`
          FOREIGN KEY (\`schedule_id\`) REFERENCES \`bill_schedule\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`bill_schedule_execution\``);
    await queryRunner.query(`
      ALTER TABLE \`bill_schedule\`
      DROP COLUMN \`status\`
    `);
  }
}
