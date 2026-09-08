import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'bill_payment' })
export class BillPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'biller_code' })
  billerCode: string;

  @Column({ name: 'consumer_number' })
  consumerNumber: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })

  @Column({
  type: 'decimal',
  precision: 12,
  scale: 2,
})

amount: number;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ name: 'idempotency_key', unique: true })
  idempotencyKey: string;

  @Column({ name: 'bbps_reference_id', nullable: true })
  bbpsReferenceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}