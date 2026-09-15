import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeycloakUserIdToBbps1788851200000 implements MigrationInterface {
  name = 'AddKeycloakUserIdToBbps1788851200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`bill_payment\`
      ADD \`keycloak_user_id\` varchar(36) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`bill_schedule\`
      ADD \`keycloak_user_id\` varchar(36) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`bill_schedule\`
      DROP COLUMN \`keycloak_user_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`bill_payment\`
      DROP COLUMN \`keycloak_user_id\`
    `);
  }
}
