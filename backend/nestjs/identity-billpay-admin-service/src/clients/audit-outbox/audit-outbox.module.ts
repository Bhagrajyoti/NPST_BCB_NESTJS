import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditOutbox } from './audit-outbox.entity';
import { AuditOutboxRepository } from './audit-outbox.repository';
import { AuditOutboxRelayJob } from './audit-outbox-relay.job';
import { AuditClient } from '../audit.client';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([AuditOutbox])],
  controllers: [],
  providers: [AuditOutboxRepository, AuditOutboxRelayJob, AuditClient],
  exports: [AuditOutboxRepository],
})
export class AuditOutboxModule {}
