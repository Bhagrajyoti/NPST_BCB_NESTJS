import { MigrationInterface, QueryRunner } from 'typeorm';

// Backs the now-real registration saga (RegistrationOrchestratorService.advance() /
// RegistrationCompensationService.rollback()) — it needs to know which Keycloak user and
// device profile a given attempt actually created, to advance/roll back precisely.
export class AddRegistrationSagaColumns1789030000000 implements MigrationInterface {
  name = 'AddRegistrationSagaColumns1789030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`registration_attempt\`
      ADD \`keycloak_user_id\` varchar(36) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`registration_attempt\`
      ADD \`device_profile_id\` varchar(36) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`registration_attempt\`
      DROP COLUMN \`device_profile_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`registration_attempt\`
      DROP COLUMN \`keycloak_user_id\`
    `);
  }
}
