import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'authorization_rule', schema: 'admin' })
export class AuthorizationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_name' })
  ruleName: string;

  @Column()
  cif: string;

  @Column('numeric')
  threshold: number;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
