import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditOutbox } from './audit-outbox.entity';

@Injectable()
export class AuditOutboxRepository {
  constructor(
    @InjectRepository(AuditOutbox)
    private readonly repository: Repository<AuditOutbox>,
  ) {}

  findPending() {
    return this.repository.find({ where: { status: 'PENDING' } as any });
  }

  // Newest rows first, optionally narrowed by event type and/or status.
  // Used by the temporary admin events-list endpoint (src/modules/admin/event-list).
  findRecent(filters: { eventType?: string; status?: string; limit: number }) {
    return this.repository.find({
      where: {
        ...(filters.eventType ? { eventType: filters.eventType } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      order: { createdAt: 'DESC' },
      take: filters.limit,
    });
  }

  save(entity: Partial<AuditOutbox>) {
    return this.repository.save(entity as AuditOutbox);
  }
}
