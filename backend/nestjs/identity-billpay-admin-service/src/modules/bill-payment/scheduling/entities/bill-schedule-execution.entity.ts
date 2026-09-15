import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BillSchedule } from './bill-schedule.entity';

@Entity({ name: 'bill_schedule_execution' })
@Index(['scheduleId', 'createdAt'])
export class BillScheduleExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schedule_id', type: 'varchar', length: 36 })
  scheduleId: string;

  @ManyToOne(() => BillSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: BillSchedule;

  @Column({ name: 'bill_number', type: 'varchar', length: 255, nullable: true })
  billNumber: string | null;

  @Column({
    name: 'bill_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  billAmount: number | null;

  @Column({
    name: 'maximum_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  maximumAmount: number | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ name: 'attempt_count', type: 'int', default: 1 })
  attemptCount: number;

  @Column({ name: 'failure_reason', type: 'varchar', length: 512, nullable: true })
  failureReason: string | null;

  @Column({ name: 'payment_id', type: 'varchar', length: 36, nullable: true })
  paymentId: string | null;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
