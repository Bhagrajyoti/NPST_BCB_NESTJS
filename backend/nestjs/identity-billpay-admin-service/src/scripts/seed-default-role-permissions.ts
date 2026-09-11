/**
 * Applies DEFAULT_ROLE_PERMISSIONS (role-matrix.default.ts) to the four system roles' local
 * `rbac_role_permission` mappings — the local-DB half of "seed the default role/permission
 * matrix". Deliberately NOT run automatically on app boot, and deliberately does NOT create
 * anything in Keycloak: it only touches a role if an `rbac_role` row with that exact name
 * already exists locally (created for real, with a real Keycloak realm role behind it, via
 * `POST /roles/create` — see rbacservice.md §4). Run it explicitly:
 *
 *   npm run seed:role-permissions
 *
 * Safe to re-run — each role's mappings are fully replaced with the current default matrix
 * (same replace-all semantics as RolesService.mapPermissions), so it's also how you reset a
 * system role back to the documented defaults after manual changes via
 * POST /roles/map-permissions.
 */
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Permission } from '../modules/rbac/entities/permission.entity';
import { Role } from '../modules/rbac/entities/role.entity';
import { RolePermission } from '../modules/rbac/entities/role-permission.entity';
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES } from '../modules/rbac/data/role-matrix.default';

const MAPPED_BY = 'system-seed-script';

async function run(): Promise<void> {
  const logger = new Logger('SeedRolePermissions');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

  try {
    const roles = app.get<Repository<Role>>(getRepositoryToken(Role));
    const permissions = app.get<Repository<Permission>>(getRepositoryToken(Permission));
    const rolePermissions = app.get<Repository<RolePermission>>(getRepositoryToken(RolePermission));

    for (const systemRole of SYSTEM_ROLES) {
      const role = await roles.findOne({ where: { name: systemRole.keycloakRoleName } });
      if (!role) {
        logger.warn(
          `Skipped ${systemRole.keycloakRoleName}: no local rbac_role row with this name. ` +
            `Create it first via POST /roles/create (name: "${systemRole.keycloakRoleName}"), ` +
            'then re-run this script.',
        );
        continue;
      }

      const codes = DEFAULT_ROLE_PERMISSIONS[systemRole.keycloakRoleName] ?? [];
      const matchedPermissions = await permissions.find({ where: { code: In(codes) } });
      const matchedCodes = new Set(matchedPermissions.map((p) => p.code));
      const missingCodes = codes.filter((code) => !matchedCodes.has(code));
      if (missingCodes.length) {
        logger.warn(
          `${systemRole.keycloakRoleName}: ${missingCodes.length} permission code(s) from the ` +
            `default matrix aren't in rbac_permission yet (${missingCodes.slice(0, 5).join(', ')}` +
            `${missingCodes.length > 5 ? ', ...' : ''}) — skipping those, applying the rest.`,
        );
      }

      await rolePermissions.delete({ roleId: role.id });
      if (matchedPermissions.length) {
        await rolePermissions.save(
          matchedPermissions.map((permission) =>
            rolePermissions.create({
              roleId: role.id,
              permissionId: permission.id,
              mappedByKeycloakUserId: MAPPED_BY,
            }),
          ),
        );
      }

      logger.log(
        `${systemRole.keycloakRoleName}: applied ${matchedPermissions.length}/${codes.length} default permissions.`,
      );
    }
  } finally {
    await app.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('seed:role-permissions failed:', error);
    process.exit(1);
  });
