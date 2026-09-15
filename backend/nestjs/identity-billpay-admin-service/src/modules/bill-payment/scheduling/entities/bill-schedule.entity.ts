import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ScheduleStatus } from '../schedule-status.constant';

@Entity({ name: 'bill_schedule' })
export class BillSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'biller_code' })
  billerCode: string;

  @Column({ name: 'consumer_number' })
  consumerNumber: string;

  @Column({ name: 'schedule_type', default: 'RECURRING' })
  scheduleType: string;

  @Column({
    name: 'frequency',
    type: 'varchar',
    nullable: true,
  })
  frequency: string | null;

  @Column({ name: 'next_run_at', type: 'datetime' })
  nextRunAt: Date;

  @Column({
    name: 'maximum_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 5000,
  })
  maximumAmount: number;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 32, default: ScheduleStatus.ACTIVE })
  status: ScheduleStatus;

  @Column({ name: 'keycloak_user_id', type: 'varchar', length: 36, nullable: true })
  keycloakUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}