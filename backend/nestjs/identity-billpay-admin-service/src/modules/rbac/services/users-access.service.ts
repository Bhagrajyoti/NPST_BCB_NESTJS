import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { KeycloakService } from '../../auth/keycloak/keycloak.service';
import { FetchAccessDetailsDto } from '../dto/fetch-access-details.dto';
import { EmployeeUserRole } from '../entities/employee-user-role.entity';
import { Employee } from '../entities/employee.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';

@Injectable()
export class UsersAccessService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(EmployeeUserRole)
    private readonly employeeRoles: Repository<EmployeeUserRole>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissions: Repository<RolePermission>,
    private readonly keycloakService: KeycloakService,
  ) {}

  async fetchAccessDetails(filters: FetchAccessDetailsDto) {
    const employees = await this.resolveEmployees(filters);
    const results = [];

    for (const employee of employees) {
      const keycloakUsers = await this.keycloakService.findUsers({
        keycloakUserId: employee.keycloakUserId,
      });
      const keycloakUser = keycloakUsers[0] ?? null;
      const keycloakRealmRoles = keycloakUser
        ? await this.keycloakService.getUserRealmRoles(keycloakUser.id)
        : [];

      const roleMappings = await this.employeeRoles.find({
        where: { employeeId: employee.id },
      });
      const roleIds = roleMappings.map((m) => m.roleId);
      const localRoles = roleIds.length
        ? await this.roles.find({ where: { id: In(roleIds) } })
        : [];

      const permissionMappings = roleIds.length
        ? await this.rolePermissions.find({
            where: { roleId: In(roleIds) },
            relations: ['permission'],
          })
        : [];

      const permissions = permissionMappings.map((m) => ({
        id: m.permission.id,
        code: m.permission.code,
        name: m.permission.name,
        module: m.permission.module,
        action: m.permission.action,
        roleId: m.roleId,
      }));

      results.push({
        employee: {
          id: employee.id,
          keycloakUserId: employee.keycloakUserId,
          username: employee.username,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
          isActive: employee.isActive,
        },
        keycloakProfile: keycloakUser
          ? {
              id: keycloakUser.id,
              username: keycloakUser.username,
              email: keycloakUser.email,
              firstName: keycloakUser.firstName,
              lastName: keycloakUser.lastName,
              enabled: keycloakUser.enabled,
            }
          : null,
        keycloakRealmRoles,
        roles: localRoles.map((role) => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          keycloakRoleId: role.keycloakRoleId,
          keycloakRoleName: role.keycloakRoleName,
          dutyType: role.dutyType,
        })),
        permissions,
      });
    }

    if (!employees.length && (filters.username || filters.email || filters.keycloakUserId)) {
      const keycloakOnlyUsers = await this.keycloakService.findUsers({
        username: filters.username,
        email: filters.email,
        keycloakUserId: filters.keycloakUserId,
      });

      for (const keycloakUser of keycloakOnlyUsers) {
        const keycloakRealmRoles = await this.keycloakService.getUserRealmRoles(keycloakUser.id);
        const roleNames = keycloakRealmRoles.map((r) => r.name);
        const localRoles = roleNames.length
          ? await this.roles.find({ where: { name: In(roleNames) } })
          : [];
        const roleIds = localRoles.map((r) => r.id);
        const permissionMappings = roleIds.length
          ? await this.rolePermissions.find({
              where: { roleId: In(roleIds) },
              relations: ['permission'],
            })
          : [];

        results.push({
          employee: null,
          keycloakProfile: {
            id: keycloakUser.id,
            username: keycloakUser.username,
            email: keycloakUser.email,
            firstName: keycloakUser.firstName,
            lastName: keycloakUser.lastName,
            enabled: keycloakUser.enabled,
          },
          keycloakRealmRoles,
          roles: localRoles.map((role) => ({
            id: role.id,
            name: role.name,
            displayName: role.displayName,
            keycloakRoleId: role.keycloakRoleId,
            keycloakRoleName: role.keycloakRoleName,
            dutyType: role.dutyType,
          })),
          permissions: permissionMappings.map((m) => ({
            id: m.permission.id,
            code: m.permission.code,
            name: m.permission.name,
            module: m.permission.module,
            action: m.permission.action,
            roleId: m.roleId,
          })),
        });
      }
    }

    return { count: results.length, users: results };
  }

  private async resolveEmployees(filters: FetchAccessDetailsDto): Promise<Employee[]> {
    if (filters.employeeId) {
      const employee = await this.employees.findOne({ where: { id: filters.employeeId } });
      return employee ? [employee] : [];
    }

    if (filters.roleId) {
      const mappings = await this.employeeRoles.find({ where: { roleId: filters.roleId } });
      if (!mappings.length) {
        return [];
      }
      return this.employees.find({
        where: { id: In(mappings.map((m) => m.employeeId)) },
      });
    }

    if (filters.keycloakUserId) {
      const employee = await this.employees.findOne({
        where: { keycloakUserId: filters.keycloakUserId },
      });
      return employee ? [employee] : [];
    }

    if (filters.username) {
      const employee = await this.employees.findOne({ where: { username: filters.username } });
      return employee ? [employee] : [];
    }

    if (filters.email) {
      const employee = await this.employees.findOne({ where: { email: filters.email } });
      return employee ? [employee] : [];
    }

    return this.employees.find({ take: 100, order: { createdAt: 'DESC' } });
  }
}
