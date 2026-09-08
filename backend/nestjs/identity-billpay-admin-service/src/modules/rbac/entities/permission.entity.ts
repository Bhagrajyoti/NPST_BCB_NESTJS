import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { RolePermission } from './role-permission.entity';

@Entity({ name: 'rbac_permission' })
export class Permission extends SoftDeleteEntity {
  @Index({ unique: true })
  @Column({ length: 100 })
  code: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 80 })
  module: string;

  @Column({ length: 80 })
  action: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => RolePermission, (mapping) => mapping.permission)
  roleMappings: RolePermission[];
}
