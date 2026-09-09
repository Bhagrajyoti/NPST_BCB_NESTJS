import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminModuleTables1788856000000 implements MigrationInterface {
  name = 'CreateAdminModuleTables1788856000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`admin_user\` (
        \`id\` CHAR(36) NOT NULL DEFAULT (UUID()),
        \`employee_id\` CHAR(36) NOT NULL,
        \`keycloak_user_id\` VARCHAR(36) NOT NULL,
        \`username\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`first_name\` VARCHAR(100) NOT NULL,
        \`last_name\` VARCHAR(100) NOT NULL,
        \`role_id\` CHAR(36) NOT NULL,
        \`role_name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`last_synced_at\` DATETIME NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_admin_user_keycloak_user_id\` (\`keycloak_user_id\`),
        KEY \`IDX_admin_user_role_name\` (\`role_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE \`authorization_rule\` (
        \`id\` CHAR(36) NOT NULL DEFAULT (UUID()),
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        \`rule_name\` VARCHAR(150) NOT NULL,
        \`cif\` VARCHAR(20) NOT NULL,
        \`threshold\` DECIMAL(18,2) NOT NULL,
        \`version\` INT NOT NULL DEFAULT 1,
        \`created_by_keycloak_user_id\` VARCHAR(36) NOT NULL,
        \`updated_by_keycloak_user_id\` VARCHAR(36) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`IDX_authorization_rule_cif\` (\`cif\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE \`authorization_rule_history\` (
        \`id\` CHAR(36) NOT NULL DEFAULT (UUID()),
        \`rule_id\` CHAR(36) NOT NULL,
        \`snapshot\` JSON NOT NULL,
        \`version\` INT NOT NULL,
        \`changed_by_keycloak_user_id\` VARCHAR(36) NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_authorization_rule_history_rule_id\` (\`rule_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `authorization_rule_history`');
    await queryRunner.query('DROP TABLE `authorization_rule`');
    await queryRunner.query('DROP TABLE `admin_user`');
  }
}
