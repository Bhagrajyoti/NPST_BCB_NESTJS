import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConsumerAndBillNumber1788784048534 implements MigrationInterface {
    name = 'AddConsumerAndBillNumber1788784048534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_988517e01eb4417484bfd3283a\` ON \`mock_bill\``);
        await queryRunner.query(`ALTER TABLE \`mock_bill\` DROP COLUMN \`customer_bill_number\``);
        await queryRunner.query(`ALTER TABLE \`mock_bill\` ADD \`consumer_number\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`mock_bill\` ADD \`bill_number\` varchar(255) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_955840860156cc2ca0d8ee57d8\` ON \`mock_bill\` (\`biller_code\`, \`consumer_number\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_955840860156cc2ca0d8ee57d8\` ON \`mock_bill\``);
        await queryRunner.query(`ALTER TABLE \`mock_bill\` DROP COLUMN \`bill_number\``);
        await queryRunner.query(`ALTER TABLE \`mock_bill\` DROP COLUMN \`consumer_number\``);
        await queryRunner.query(`ALTER TABLE \`mock_bill\` ADD \`customer_bill_number\` varchar(255) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_988517e01eb4417484bfd3283a\` ON \`mock_bill\` (\`biller_code\`, \`customer_bill_number\`)`);
    }

}
