import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'bill_schedule', schema: 'billpay' })
export class BillSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'biller_code' })
  billerCode: string;

  @Column({ name: 'consumer_number' })
  consumerNumber: string;

  @Column()
  frequency: string;

  @Column({ name: 'next_run_at', type: 'timestamptz' })
  nextRunAt: Date;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
