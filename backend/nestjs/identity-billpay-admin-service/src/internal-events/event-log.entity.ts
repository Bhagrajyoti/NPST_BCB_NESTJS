import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'event_log', schema: 'admin' })
export class EventLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_name' })
  eventName: string;

  @Column('jsonb')
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
