import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InternalEventBusService } from '../../internal-events/internal-event-bus.service';
import { AuditOutboxRepository } from '../../clients/audit-outbox/audit-outbox.repository';
import {
  ADMIN_ACTION_AUDITED_EVENT,
  AdminActionAuditedEvent,
} from './events/admin-action-audited.event';

// Writes every admin action into the durable audit outbox. AuditOutboxRelayJob
// picks pending rows up later and ships them to the Audit service.
@Injectable()
export class AdminActionAuditListener implements OnModuleInit {
  private readonly logger = new Logger(AdminActionAuditListener.name);

  constructor(
    private readonly eventBus: InternalEventBusService,
    private readonly outbox: AuditOutboxRepository,
  ) {}

  onModuleInit(): void {
    this.eventBus.on(ADMIN_ACTION_AUDITED_EVENT, (payload) => {
      this.handle(payload as AdminActionAuditedEvent).catch((error) =>
        this.logger.error('Failed to write admin action to audit outbox', error),
      );
    });
  }

  private async handle(event: AdminActionAuditedEvent): Promise<void> {
    await this.outbox.save({
      eventType: ADMIN_ACTION_AUDITED_EVENT,
      payload: {
        adminUserId: event.adminUserId,
        action: event.action,
        targetId: event.targetId,
      },
      status: 'PENDING',
    });
  }
}
