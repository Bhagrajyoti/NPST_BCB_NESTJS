import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InternalEventBusService } from '../../internal-events/internal-event-bus.service';
import { AuditOutboxRepository } from '../../clients/audit-outbox/audit-outbox.repository';
import { maskMobile } from '../../common/utils/masking.util';
import { USER_REGISTERED_EVENT, UserRegisteredEvent } from './events/user-registered.event';
import { USER_DEACTIVATED_EVENT, UserDeactivatedEvent } from './events/user-deactivated.event';

// Writes auth events into the durable audit outbox. AuditOutboxRelayJob
// picks pending rows up later and ships them to the Audit service.
@Injectable()
export class AuthEventsAuditListener implements OnModuleInit {
  private readonly logger = new Logger(AuthEventsAuditListener.name);

  constructor(
    private readonly eventBus: InternalEventBusService,
    private readonly outbox: AuditOutboxRepository,
  ) {}

  onModuleInit(): void {
    this.eventBus.on(USER_REGISTERED_EVENT, (payload) => {
      const event = payload as UserRegisteredEvent;
      this.write(USER_REGISTERED_EVENT, {
        userId: event.userId,
        // Never store a raw mobile number in the audit trail.
        mobileNumber: maskMobile(event.mobileNumber),
      });
    });

    this.eventBus.on(USER_DEACTIVATED_EVENT, (payload) => {
      const event = payload as UserDeactivatedEvent;
      this.write(USER_DEACTIVATED_EVENT, {
        userId: event.userId,
        reason: event.reason,
      });
    });
  }

  private write(eventType: string, payload: Record<string, unknown>): void {
    this.outbox
      .save({ eventType, payload, status: 'PENDING' })
      .catch((error) => this.logger.error(`Failed to write ${eventType} to audit outbox`, error));
  }
}
