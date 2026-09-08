import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialBillPayment1788780440681 implements MigrationInterface {
    name = 'InitialBillPayment1788780440681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`event_log\` (\`id\` varchar(36) NOT NULL, \`event_name\` varchar(255) NOT NULL, \`payload\` json NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`audit_outbox\` (\`id\` varchar(36) NOT NULL, \`event_type\` varchar(255) NOT NULL, \`payload\` json NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'PENDING', \`attempts\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notification_template\` (\`id\` varchar(36) NOT NULL, \`template_key\` varchar(255) NOT NULL, \`channel\` varchar(255) NOT NULL, \`subject\` varchar(255) NULL, \`body\` text NOT NULL, \`version\` int NOT NULL DEFAULT '1', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notification_template_history\` (\`id\` varchar(36) NOT NULL, \`template_id\` varchar(255) NOT NULL, \`body\` text NOT NULL, \`version\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`bill_schedule\` (\`id\` varchar(36) NOT NULL, \`biller_code\` varchar(255) NOT NULL, \`consumer_number\` varchar(255) NOT NULL, \`frequency\` varchar(255) NOT NULL, \`next_run_at\` datetime NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`bill_payment\` (\`id\` varchar(36) NOT NULL, \`biller_code\` varchar(255) NOT NULL, \`consumer_number\` varchar(255) NOT NULL, \`amount\` decimal NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'PENDING', \`bbps_reference_id\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`biller_registration\` (\`id\` varchar(36) NOT NULL, \`biller_code\` varchar(255) NOT NULL, \`biller_name\` varchar(255) NOT NULL, \`category\` varchar(255) NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`registration_attempt\` (\`id\` varchar(36) NOT NULL, \`mobile_number\` varchar(255) NOT NULL, \`pan_or_cif\` varchar(255) NOT NULL, \`current_step\` varchar(255) NOT NULL DEFAULT 'INIT', \`failure_reason\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`mock_bill\` (\`id\` varchar(36) NOT NULL, \`biller_code\` varchar(255) NOT NULL, \`customer_bill_number\` varchar(255) NOT NULL, \`registered_mobile\` varchar(255) NOT NULL, \`customer_name\` varchar(255) NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`due_date\` date NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'UNPAID', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_988517e01eb4417484bfd3283a\` (\`biller_code\`, \`customer_bill_number\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`otp_challenge\` (\`id\` varchar(36) NOT NULL, \`mobile_number\` varchar(255) NOT NULL, \`otp_hash\` varchar(255) NOT NULL, \`attempt_count\` int NOT NULL DEFAULT '0', \`locked_until\` datetime NULL, \`expires_at\` datetime NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`device_profile\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(255) NOT NULL, \`device_id\` varchar(255) NOT NULL, \`device_model\` varchar(255) NULL, \`trusted\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`credential\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(255) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`last_rotated_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`corporate_hierarchy\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(255) NOT NULL, \`cif\` varchar(255) NOT NULL, \`role\` varchar(255) NOT NULL, \`approval_limit\` decimal NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`cif_link\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(255) NOT NULL, \`cif\` varchar(255) NOT NULL, \`linked_by\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`authorization_rule\` (\`id\` varchar(36) NOT NULL, \`rule_name\` varchar(255) NOT NULL, \`cif\` varchar(255) NOT NULL, \`threshold\` decimal NOT NULL, \`version\` int NOT NULL DEFAULT '1', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`authorization_rule_history\` (\`id\` varchar(36) NOT NULL, \`rule_id\` varchar(255) NOT NULL, \`snapshot\` json NOT NULL, \`version\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`admin_user\` (\`id\` varchar(36) NOT NULL, \`username\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`admin_user\``);
        await queryRunner.query(`DROP TABLE \`authorization_rule_history\``);
        await queryRunner.query(`DROP TABLE \`authorization_rule\``);
        await queryRunner.query(`DROP TABLE \`cif_link\``);
        await queryRunner.query(`DROP TABLE \`corporate_hierarchy\``);
        await queryRunner.query(`DROP TABLE \`credential\``);
        await queryRunner.query(`DROP TABLE \`device_profile\``);
        await queryRunner.query(`DROP TABLE \`otp_challenge\``);
        await queryRunner.query(`DROP INDEX \`IDX_988517e01eb4417484bfd3283a\` ON \`mock_bill\``);
        await queryRunner.query(`DROP TABLE \`mock_bill\``);
        await queryRunner.query(`DROP TABLE \`registration_attempt\``);
        await queryRunner.query(`DROP TABLE \`biller_registration\``);
        await queryRunner.query(`DROP TABLE \`bill_payment\``);
        await queryRunner.query(`DROP TABLE \`bill_schedule\``);
        await queryRunner.query(`DROP TABLE \`notification_template_history\``);
        await queryRunner.query(`DROP TABLE \`notification_template\``);
        await queryRunner.query(`DROP TABLE \`audit_outbox\``);
        await queryRunner.query(`DROP TABLE \`event_log\``);
    }

}
