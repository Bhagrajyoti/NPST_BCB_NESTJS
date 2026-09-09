import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'authorization_rule' })
export class AuthorizationRule extends SoftDeleteEntity {
  @Column({ name: 'rule_name', length: 150 })
  ruleName: string;

  @Index()
  @Column({ length: 20 })
  cif: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  threshold: string;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'created_by_keycloak_user_id', length: 36 })
  createdByKeycloakUserId: string;

  @Column({ name: 'updated_by_keycloak_user_id', type: 'varchar', length: 36, nullable: true })
  updatedByKeycloakUserId: string | null;
}
