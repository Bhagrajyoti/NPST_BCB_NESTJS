import { Column, Entity } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'device_profile' })
export class DeviceProfile extends SoftDeleteEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'device_id' })
  deviceId: string;

  @Column({ name: 'device_model', type: 'varchar', length: 255, nullable: true })
  deviceModel: string | null;

  @Column({ default: false })
  trusted: boolean;
}
