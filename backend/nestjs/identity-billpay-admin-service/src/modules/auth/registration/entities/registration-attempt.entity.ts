import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'registration_attempt', schema: 'identity' })
export class RegistrationAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mobile_number' })
  mobileNumber: string;

  @Column({ name: 'pan_or_cif' })
  panOrCif: string;

  @Column({ name: 'current_step', default: 'INIT' })
  currentStep: string;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
