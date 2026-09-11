import { MigrationInterface, QueryRunner } from 'typeorm';

// Backs `highRisk` on the Permission entity — flags permissions from the RBAC design doc
// (section 13) that need a secondary confirmation step in the UI. See permission-catalogue.ts.
export class AddPermissionHighRisk1789150000000 implements MigrationInterface {
  name = 'AddPermissionHighRisk1789150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`rbac_permission\`
      ADD \`high_risk\` tinyint NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`rbac_permission\`
      DROP COLUMN \`high_risk\`
    `);
  }
}
