import { InternalEventBusService } from '../../../internal-events/internal-event-bus.service';
import {
  EMPLOYEE_ACCOUNT_SYNCED_EVENT,
  EmployeeAccountSyncedEvent,
} from '../events/employee-account-synced.event';

import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeycloakService } from '../../auth/keycloak/keycloak.service';
import {
  canAssignRoleToEmployee,
  canManageEmployeeWithRole,
  isEmployeeManager,
} from '../constants/rbac.constants';
import { CreateEmployeeDto, UpdateEmployeeRoleDto } from '../dto/employee.dto';
import { EmployeeUserRole } from '../entities/employee-user-role.entity';
import { Employee } from '../entities/employee.entity';
import { RolesService } from './roles.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(EmployeeUserRole)
    private readonly employeeRoles: Repository<EmployeeUserRole>,
    private readonly rolesService: RolesService,
    private readonly keycloakService: KeycloakService,
    private readonly eventBus: InternalEventBusService,
  ) {}

  async create(
    dto: CreateEmployeeDto,
    actor: Record<string, unknown>,
  ) {
    this.assertCanManageEmployees(actor);
    const actorKeycloakUserId = actor.sub as string;
    const role = await this.rolesService.assertCanAssignRole(actor, dto.roleId);
    await this.rolesService.assertMakerCheckerCompatibility([dto.roleId]);
    this.assertActorCanAssignRole(actor, role.name);

    const existingUsername = await this.employees.findOne({ where: { username: dto.username } });
    if (existingUsername) {
      throw new ConflictException(`Employee username ${dto.username} already exists`);
    }

    const keycloakUser = await this.keycloakService.createUser({
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      enabled: true,
    });

    await this.keycloakService.assignRealmRoleToUser(keycloakUser.id, role.keycloakRoleName);

    const employee = await this.employees.save(
      this.employees.create({
        keycloakUserId: keycloakUser.id,
        username: dto.username,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        employeeCode: dto.employeeCode ?? null,
        createdByKeycloakUserId: actorKeycloakUserId,
        isActive: true,
      }),
    );

    const assignment = await this.employeeRoles.save(
      this.employeeRoles.create({
        employeeId: employee.id,
        roleId: role.id,
        assignedByKeycloakUserId: actorKeycloakUserId,
      }),
    );

    const roleDetails = await this.rolesService.findRoleWithPermissions(role.id);

      this.eventBus.publish(
      EMPLOYEE_ACCOUNT_SYNCED_EVENT,
      new EmployeeAccountSyncedEvent(
        employee.id,
        employee.keycloakUserId,
        employee.username,
        employee.email,
        employee.firstName,
        employee.lastName,
        role.id,
        role.name,
        employee.isActive,
      ),
    );

    return {
      employee: {
        id: employee.id,
        keycloakUserId: employee.keycloakUserId,
        username: employee.username,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeCode: employee.employeeCode,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
      },
      roleAssignment: {
        id: assignment.id,
        roleId: assignment.roleId,
        assignedAt: assignment.assignedAt,
      },
      role: roleDetails,
      keycloakRealmRoles: await this.keycloakService.getUserRealmRoles(keycloakUser.id),
    };
  }

  async updateRole(dto: UpdateEmployeeRoleDto, actor: Record<string, unknown>) {
    this.assertCanManageEmployees(actor);
    const actorKeycloakUserId = actor.sub as string;

    const employee = await this.employees.findOne({ where: { id: dto.employeeId, isActive: true } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const newRole = await this.rolesService.assertCanAssignRole(actor, dto.roleId);
    await this.rolesService.assertMakerCheckerCompatibility([dto.roleId]);
    this.assertActorCanAssignRole(actor, newRole.name);

    const currentAssignment = await this.employeeRoles.findOne({
      where: { employeeId: employee.id },
      relations: ['role'],
    });

    if (currentAssignment?.role) {
      this.assertActorCanManageEmployee(actor, currentAssignment.role.name);
    }

    if (currentAssignment?.roleId === newRole.id) {
      throw new ConflictException('Employee already has this role assigned');
    }

    if (currentAssignment?.role) {
      await this.keycloakService.removeRealmRoleFromUser(
        employee.keycloakUserId,
        currentAssignment.role.keycloakRoleName,
      );
    }

    await this.keycloakService.assignRealmRoleToUser(employee.keycloakUserId, newRole.keycloakRoleName);

    let assignment: EmployeeUserRole;
    if (currentAssignment) {
      currentAssignment.roleId = newRole.id;
      currentAssignment.assignedByKeycloakUserId = actorKeycloakUserId;
      assignment = await this.employeeRoles.save(currentAssignment);
    } else {
      assignment = await this.employeeRoles.save(
        this.employeeRoles.create({
          employeeId: employee.id,
          roleId: newRole.id,
          assignedByKeycloakUserId: actorKeycloakUserId,
        }),
      );
    }

    const roleDetails = await this.rolesService.findRoleWithPermissions(newRole.id);

    this.eventBus.publish(
      EMPLOYEE_ACCOUNT_SYNCED_EVENT,
      new EmployeeAccountSyncedEvent(
        employee.id,
        employee.keycloakUserId,
        employee.username,
        employee.email,
        employee.firstName,
        employee.lastName,
        newRole.id,
        newRole.name,
        employee.isActive,
      ),
    );
    
    return {
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
      roleAssignment: {
        id: assignment.id,
        roleId: assignment.roleId,
        assignedAt: assignment.assignedAt,
        updatedByKeycloakUserId: actorKeycloakUserId,
      },
      role: roleDetails,
      keycloakRealmRoles: await this.keycloakService.getUserRealmRoles(employee.keycloakUserId),
    };
  }

  private assertCanManageEmployees(actor: Record<string, unknown>): void {
    if (!isEmployeeManager(actor)) {
      throw new ForbiddenException(
        'Only superadmin or bank admin users can manage employee roles',
      );
    }
  }

  private assertActorCanManageEmployee(actor: Record<string, unknown>, employeeRoleName: string): void {
    if (!canManageEmployeeWithRole(actor, employeeRoleName)) {
      throw new ForbiddenException(
        'You cannot change the role of an employee at your level or higher in the hierarchy',
      );
    }
  }

  private assertActorCanAssignRole(actor: Record<string, unknown>, targetRoleName: string): void {
    if (!canAssignRoleToEmployee(actor, targetRoleName)) {
      throw new ForbiddenException(
        'You cannot assign a role at your level or higher in the hierarchy',
      );
    }
  }
}
