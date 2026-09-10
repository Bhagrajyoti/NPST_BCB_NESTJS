import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Durable store backing IdempotencyGuard — a request replayed with the same
// Idempotency-Key + route is detected here rather than trusted to client behavior.
@Entity({ name: 'idempotency_record' })
@Unique(['idempotencyKey', 'route'])
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'idempotency_key' })
  idempotencyKey: string;

  @Column()
  route: string;

  @Column({ name: 'request_hash' })
  requestHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
