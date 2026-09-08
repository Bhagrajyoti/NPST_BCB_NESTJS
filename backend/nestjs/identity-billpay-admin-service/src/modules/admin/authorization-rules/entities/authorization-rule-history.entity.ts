import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'authorization_rule_history' })
export class AuthorizationRuleHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'rule_id', type: 'uuid' })
  ruleId: string;

  @Column({ type: 'json' })
  snapshot: Record<string, unknown>;

  @Column()
  version: number;

  @Column({ name: 'changed_by_keycloak_user_id', length: 36 })
  changedByKeycloakUserId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
