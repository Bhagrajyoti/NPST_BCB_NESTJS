import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateBillPaymentAmount1788844566220 implements MigrationInterface {
    name = 'UpdateBillPaymentAmount1788844566220'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bill_payment\` CHANGE \`amount\` \`amount\` decimal(12,2) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bill_payment\` CHANGE \`amount\` \`amount\` decimal(10,0) NOT NULL`);
    }

}
