import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditOutboxRepository } from './audit-outbox.repository';
import { AuditClient } from '../audit.client';

const MAX_RELAY_ATTEMPTS = 5;

// Async relay of local outbox rows to the Audit service. Never a synchronous call dressed up
// as "outbox" — rows are written durably elsewhere and picked up here, independently, on a
// timer, so a slow/down Audit service never blocks whatever wrote the row.
@Injectable()
export class AuditOutboxRelayJob {
  private readonly logger = new Logger(AuditOutboxRelayJob.name);

  constructor(
    private readonly repository: AuditOutboxRepository,
    private readonly auditClient: AuditClient,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handle(): Promise<void> {
    const pending = await this.repository.findPending();
    if (pending.length === 0) {
      this.logger.debug('AuditOutboxRelayJob tick — nothing pending');
      return;
    }

    this.logger.log(`AuditOutboxRelayJob relaying ${pending.length} pending row(s)`);

    for (const row of pending) {
      try {
        await this.auditClient.relay(row.eventType, row.payload);
        await this.repository.save({ ...row, status: 'SENT' });
      } catch (error) {
        const attempts = row.attempts + 1;
        const status = attempts >= MAX_RELAY_ATTEMPTS ? 'FAILED' : 'PENDING';
        this.logger.warn(
          `Relay failed for outbox row ${row.id} (attempt ${attempts}/${MAX_RELAY_ATTEMPTS}): ` +
            `${(error as Error).message}`,
        );
        await this.repository.save({ ...row, attempts, status });
      }
    }
  }
}
