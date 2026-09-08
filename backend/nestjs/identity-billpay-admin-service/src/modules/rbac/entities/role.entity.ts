import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { RoleDutyType } from '../constants/rbac.constants';
import { RolePermission } from './role-permission.entity';
import { EmployeeUserRole } from './employee-user-role.entity';
import { DelegatedRole } from './delegated-role.entity';

@Entity({ name: 'rbac_role' })
export class Role extends SoftDeleteEntity {
  @Index({ unique: true })
  @Column({ length: 100 })
  name: string;

  @Column({ name: 'display_name', length: 150 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ name: 'keycloak_role_id', length: 36 })
  keycloakRoleId: string;

  @Index()
  @Column({ name: 'keycloak_role_name', length: 100 })
  keycloakRoleName: string;

  @Column({ name: 'duty_type', type: 'enum', enum: RoleDutyType, default: RoleDutyType.OTHER })
  dutyType: RoleDutyType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => RolePermission, (mapping) => mapping.role)
  permissionMappings: RolePermission[];

  @OneToMany(() => EmployeeUserRole, (mapping) => mapping.role)
  employeeMappings: EmployeeUserRole[];

  @OneToMany(() => DelegatedRole, (mapping) => mapping.role)
  delegations: DelegatedRole[];
}
