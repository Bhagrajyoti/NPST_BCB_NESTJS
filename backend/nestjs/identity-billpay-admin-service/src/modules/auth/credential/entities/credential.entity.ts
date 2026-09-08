import { Column, Entity } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'credential' })
export class Credential extends SoftDeleteEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'last_rotated_at', type: 'timestamp', nullable: true })
  lastRotatedAt: Date | null;
}
