import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * Separate from `biller_registration`/`mock_bill` on purpose: those two fill up with
 * randomly-named rows every time the e2e suite runs (`npm run test:e2e`), which makes them
 * unusable for manual/Swagger testing. This table holds a small fixed set of clean,
 * memorable billers+bills (seeded by DemoBbpsDataSeeder) that BillService/PaymentService
 * fall back to when a lookup misses the real tables — see docs/mock-testing-guide.md.
 */
@Entity({ name: 'demo_bbps_data' })
@Unique(['billerCode', 'consumerNumber'])
export class DemoBbpsData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'biller_code' })
  billerCode: string;

  @Column({ name: 'biller_name' })
  billerName: string;

  @Column()
  category: string;

  @Column({ name: 'consumer_number' })
  consumerNumber: string;

  @Column({ name: 'bill_number' })
  billNumber: string;

  @Column({ name: 'registered_mobile' })
  registeredMobile: string;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ default: 'UNPAID' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
