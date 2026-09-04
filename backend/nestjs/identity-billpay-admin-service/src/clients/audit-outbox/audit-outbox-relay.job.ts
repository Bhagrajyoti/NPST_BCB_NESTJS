import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

// Async relay of local outbox rows to the Audit service.
@Injectable()
export class AuditOutboxRelayJob {
  private readonly logger = new Logger(AuditOutboxRelayJob.name);

  @Cron(CronExpression.EVERY_MINUTE)
  async handle(): Promise<void> {
    this.logger.debug('AuditOutboxRelayJob tick');
  }
}
