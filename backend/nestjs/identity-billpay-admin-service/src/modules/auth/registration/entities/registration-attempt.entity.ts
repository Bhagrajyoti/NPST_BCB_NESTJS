import { Column, Entity } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'registration_attempt' })
export class RegistrationAttempt extends SoftDeleteEntity {
  @Column({ name: 'mobile_number' })
  mobileNumber: string;

  @Column({ name: 'pan_or_cif' })
  panOrCif: string;

  @Column({ name: 'current_step', default: 'INIT' })
  currentStep: string;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;
}
