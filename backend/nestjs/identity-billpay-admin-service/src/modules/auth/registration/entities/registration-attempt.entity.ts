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

  // Set once the CREDENTIALS_SET/KEYCLOAK_USER_CREATED step provisions a real Keycloak
  // account — RegistrationCompensationService.rollback() needs this to disable the user if a
  // later step fails, and it's also what the client eventually logs in with.
  @Column({ name: 'keycloak_user_id', type: 'varchar', length: 36, nullable: true })
  keycloakUserId: string | null;

  // Set once the DEVICE_REGISTERED step succeeds — lets rollback() target the exact device
  // profile row this attempt created, not "some device belonging to this user".
  @Column({ name: 'device_profile_id', type: 'varchar', length: 36, nullable: true })
  deviceProfileId: string | null;
}
