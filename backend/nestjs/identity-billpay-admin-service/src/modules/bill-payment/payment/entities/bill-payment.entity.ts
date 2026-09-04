import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'bill_payment', schema: 'billpay' })
export class BillPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'biller_code' })
  billerCode: string;

  @Column({ name: 'consumer_number' })
  consumerNumber: string;

  @Column('numeric')
  amount: number;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ name: 'bbps_reference_id', nullable: true })
  bbpsReferenceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
