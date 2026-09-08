import { Column, Entity } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'otp_challenge' })
export class OtpChallenge extends SoftDeleteEntity {
  @Column({ name: 'mobile_number' })
  mobileNumber: string;

  @Column({ name: 'otp_hash' })
  otpHash: string;

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}
