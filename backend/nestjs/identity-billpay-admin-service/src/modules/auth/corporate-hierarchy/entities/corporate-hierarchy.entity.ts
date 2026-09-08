import { Column, Entity } from 'typeorm';
import { SoftDeleteEntity } from '../../../../common/entities/soft-delete.entity';

@Entity({ name: 'corporate_hierarchy' })
export class CorporateHierarchy extends SoftDeleteEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  cif: string;

  @Column()
  role: string;

  @Column({ name: 'approval_limit', type: 'decimal', precision: 18, scale: 2, nullable: true })
  approvalLimit: number | null;
}
