import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'biller_registration', schema: 'billpay' })
export class BillerRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'biller_code' })
  billerCode: string;

  @Column({ name: 'biller_name' })
  billerName: string;

  @Column()
  category: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
