import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditOutbox } from './audit-outbox.entity';
import { AuditOutboxRepository } from './audit-outbox.repository';
import { AuditOutboxRelayJob } from './audit-outbox-relay.job';

@Module({
  imports: [TypeOrmModule.forFeature([AuditOutbox])],
  controllers: [],
  providers: [AuditOutboxRepository, AuditOutboxRelayJob],
  exports: [AuditOutboxRepository],
})
export class AuditOutboxModule {}
