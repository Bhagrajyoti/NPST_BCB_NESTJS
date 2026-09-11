import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { KeycloakService } from '../../auth/keycloak/keycloak.service';
import { resolveRoleDutyType, RoleDutyType } from '../constants/rbac.constants';
import { CreateRoleDto, MapRolePermissionsDto, UpdateRoleDto } from '../dto/role.dto';
import { DelegatedRole } from '../entities/delegated-role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissions: Repository<RolePermission>,
    @InjectRepository(DelegatedRole)
    private readonly delegatedRoles: Repository<DelegatedRole>,
    private readonly keycloakService: KeycloakService,
  ) {}

  async create(dto: CreateRoleDto, actorKeycloakUserId: string) {
    const existing = await this.roles.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Role ${dto.name} already exists`);
    }

    const keycloakRole = await this.keycloakService.createRealmRole({
      name: dto.name,
      description: dto.description,
    });

    const role = await this.roles.save(
      this.roles.create({
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description ?? null,
        keycloakRoleId: keycloakRole.id,
        keycloakRoleName: keycloakRole.name,
        dutyType: resolveRoleDutyType(dto.name),
        isActive: true,
      }),
    );

    if (dto.delegatedAdminKeycloakUserIds?.length) {
      await this.replaceDelegations(role.id, dto.delegatedAdminKeycloakUserIds, actorKeycloakUserId);
    }

    return this.findRoleWithPermissions(role.id);
  }

  async update(dto: UpdateRoleDto, actorKeycloakUserId: string) {
    const role = await this.roles.findOne({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.description !== undefined) {
      await this.keycloakService.updateRealmRole(role.keycloakRoleName, {
        description: dto.description,
      });
      role.description = dto.description;
    }

    if (dto.displayName !== undefined) {
      role.displayName = dto.displayName;
    }

    if (dto.isActive !== undefined) {
      role.isActive = dto.isActive;
    }

    await this.roles.save(role);

    if (dto.delegatedAdminKeycloakUserIds) {
      await this.replaceDelegations(role.id, dto.delegatedAdminKeycloakUserIds, actorKeycloakUserId);
    }

    return this.findRoleWithPermissions(role.id);
  }

  async mapPermissions(dto: MapRolePermissionsDto, actorKeycloakUserId: string) {
    const role = await this.roles.findOne({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.permissions.find({
      where: { id: In(dto.permissionIds), isActive: true },
    });
    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid or inactive');
    }

    await this.rolePermissions.delete({ roleId: role.id });

    const mappings = dto.permissionIds.map((permissionId) =>
      this.rolePermissions.create({
        roleId: role.id,
        permissionId,
        mappedByKeycloakUserId: actorKeycloakUserId,
      }),
    );
    await this.rolePermissions.save(mappings);

    return this.findRoleWithPermissions(role.id);
  }

  async findRoleWithPermissions(roleId: string) {
    const role = await this.roles.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const mappings = await this.rolePermissions.find({
      where: { roleId },
      relations: ['permission'],
    });

    const delegations = await this.delegatedRoles.find({ where: { roleId } });

    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      keycloakRoleId: role.keycloakRoleId,
      keycloakRoleName: role.keycloakRoleName,
      dutyType: role.dutyType,
      isActive: role.isActive,
      permissions: mappings.map((m) => ({
        id: m.permission.id,
        code: m.permission.code,
        name: m.permission.name,
        module: m.permission.module,
        action: m.permission.action,
        highRisk: m.permission.highRisk,
      })),
      delegatedAdminKeycloakUserIds: delegations.map((d) => d.delegateKeycloakUserId),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async assertMakerCheckerCompatibility(roleIds: string[]): Promise<void> {
    const roles = await this.roles.find({ where: { id: In(roleIds) } });
    const hasMaker = roles.some((r) => r.dutyType === RoleDutyType.MAKER);
    const hasChecker = roles.some((r) => r.dutyType === RoleDutyType.CHECKER);
    if (hasMaker && hasChecker) {
      throw new BadRequestException(
        'Maker-Checker segregation violated: a user cannot hold both Maker and Checker roles',
      );
    }
  }

  async assertCanAssignRole(
    actor: Record<string, unknown>,
    roleId: string,
  ): Promise<Role> {
    const role = await this.roles.findOne({ where: { id: roleId, isActive: true } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const realmRoles = (actor.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
    const isSuperAdmin = realmRoles.some((r) =>
      ['BANK_SUPER_ADMIN', 'SUPERADMIN', 'superadmin'].includes(r),
    );
    if (isSuperAdmin) {
      return role;
    }

    const actorId = (actor.sub as string) ?? '';
    const delegation = await this.delegatedRoles.findOne({
      where: { roleId, delegateKeycloakUserId: actorId },
    });
    if (!delegation) {
      throw new ForbiddenException(
        'You are not authorized to assign this role. Superadmin delegation is required.',
      );
    }

    return role;
  }

  private async replaceDelegations(
    roleId: string,
    delegateIds: string[],
    grantedBy: string,
  ): Promise<void> {
    await this.delegatedRoles.delete({ roleId });
    if (!delegateIds.length) {
      return;
    }
    const rows = delegateIds.map((delegateKeycloakUserId) =>
      this.delegatedRoles.create({
        roleId,
        delegateKeycloakUserId,
        grantedByKeycloakUserId: grantedBy,
      }),
    );
    await this.delegatedRoles.save(rows);
  }
}
