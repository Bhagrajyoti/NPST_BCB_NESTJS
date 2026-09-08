import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { EmployeeUserRole } from './employee-user-role.entity';

@Entity({ name: 'rbac_employee' })
export class Employee extends SoftDeleteEntity {
  @Index({ unique: true })
  @Column({ name: 'keycloak_user_id', length: 36 })
  keycloakUserId: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  username: string;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'employee_code', type: 'varchar', length: 50, nullable: true })
  employeeCode: string | null;

  @Column({ name: 'created_by_keycloak_user_id', length: 36 })
  createdByKeycloakUserId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => EmployeeUserRole, (mapping) => mapping.employee)
  roleMappings: EmployeeUserRole[];
}
