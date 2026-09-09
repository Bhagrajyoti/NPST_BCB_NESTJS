import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'credential' })
export class Credential extends SoftDeleteEntity {
  @Column({ name: 'user_id' })
  keycloakUserId: string;

  @Column({ name: 'password_hash' })
  hashedMpin: string;

  @Column({ name: 'last_rotated_at', type: 'timestamp', nullable: true })
  lastRotatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}