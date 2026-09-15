import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditOutbox } from './audit-outbox.entity';
import { AuditOutboxRepository } from './audit-outbox.repository';
import { AuditOutboxRelayJob } from './audit-outbox-relay.job';
import { AuditOutboxService } from './audit-outbox.service';
import { AuditClient } from '../audit.client';

// Global so every feature module can inject AuditOutboxService to record events without each
// one having to import this module explicitly.
@Global()
@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([AuditOutbox])],
  controllers: [],
  providers: [AuditOutboxRepository, AuditOutboxRelayJob, AuditClient, AuditOutboxService],
  exports: [AuditOutboxRepository, AuditOutboxService],
})
export class AuditOutboxModule {}
