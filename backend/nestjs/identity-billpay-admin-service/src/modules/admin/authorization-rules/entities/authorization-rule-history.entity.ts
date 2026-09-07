import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'authorization_rule_history', schema: 'admin' })
export class AuthorizationRuleHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_id' })
  ruleId: string;

  @Column('json')
  snapshot: Record<string, unknown>;

  @Column()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
