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

  save(entity: Partial<AuditOutbox>) {
    return this.repository.save(entity as AuditOutbox);
  }
}
