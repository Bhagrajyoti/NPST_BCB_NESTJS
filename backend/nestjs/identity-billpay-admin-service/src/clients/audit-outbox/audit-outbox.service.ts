import { Injectable, Logger } from '@nestjs/common';
import { AuditOutboxRepository } from './audit-outbox.repository';

/**
 * Producer-side API for the audit outbox pattern: call `record()` right after a business
 * action succeeds, and AuditOutboxRelayJob (cron, every minute) picks the row up and relays it
 * to the external Audit service independently. Writing the row itself is deliberately
 * best-effort and never throws — a failure to record an audit event must never fail (or roll
 * back) the real action it's describing.
 */
@Injectable()
export class AuditOutboxService {
  private readonly logger = new Logger(AuditOutboxService.name);

  constructor(private readonly repository: AuditOutboxRepository) {}

  async record(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.repository.save({ eventType, payload, status: 'PENDING', attempts: 0 });
    } catch (error) {
      this.logger.error(`Failed to record audit event ${eventType}`, error as Error);
    }
  }
}
