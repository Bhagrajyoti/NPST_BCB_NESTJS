import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { ALL_PERMISSIONS } from './data/permission-catalogue';

// Every permission code ends in a verb-ish suffix (VIEW, CREATE, ASSIGN_ROLE, ...); this just
// grabs it for the required `action` column. Not used for any access-control decision — the
// full `code` is the actual authorization unit (see permission-catalogue.ts's own comment) —
// so an imperfect split here (e.g. "ROLE" for USER_ASSIGN_ROLE) is cosmetic, not a bug.
function deriveAction(code: string): string {
  const lastUnderscore = code.lastIndexOf('_');
  return lastUnderscore === -1 ? code : code.slice(lastUnderscore + 1);
}

/**
 * Idempotently (re)inserts the full 159-permission catalogue (permission-catalogue.ts, kept in
 * lockstep with the frontend's local RBAC fallback) into `rbac_permission` on every boot — same
 * pattern as DemoBbpsDataSeeder/BankAccountSeeder. Purely local: no Keycloak call, safe to run
 * unconditionally. Existing rows (including ad-hoc ones created via POST /permissions/create)
 * are left untouched — this only fills in codes that are missing.
 */
@Injectable()
export class PermissionCatalogueSeeder implements OnModuleInit {
  private readonly logger = new Logger(PermissionCatalogueSeeder.name);

  constructor(
    @InjectRepository(Permission)
    private readonly repository: Repository<Permission>,
  ) {}

  async onModuleInit(): Promise<void> {
    let inserted = 0;
    for (const def of ALL_PERMISSIONS) {
      const existing = await this.repository.findOne({ where: { code: def.code } });
      if (!existing) {
        await this.repository.save(
          this.repository.create({
            code: def.code,
            name: def.description,
            description: null,
            module: def.module,
            action: deriveAction(def.code),
            isActive: true,
            highRisk: def.highRisk ?? false,
          }),
        );
        inserted += 1;
      }
    }
    this.logger.log(
      `rbac_permission catalogue ready (${ALL_PERMISSIONS.length} defined, ${inserted} inserted this boot)`,
    );
  }
}
