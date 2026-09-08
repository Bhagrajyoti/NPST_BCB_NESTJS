import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity({ name: 'rbac_delegated_role' })
@Index(['delegateKeycloakUserId', 'roleId'], { unique: true })
export class DelegatedRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delegate_keycloak_user_id', length: 36 })
  delegateKeycloakUserId: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'granted_by_keycloak_user_id', length: 36 })
  grantedByKeycloakUserId: string;

  @CreateDateColumn({ name: 'granted_at', type: 'timestamp' })
  grantedAt: Date;

  @ManyToOne(() => Role, (role) => role.delegations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
