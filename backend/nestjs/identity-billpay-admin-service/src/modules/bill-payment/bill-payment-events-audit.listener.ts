import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InternalEventBusService } from '../../internal-events/internal-event-bus.service';
import { AuditOutboxRepository } from '../../clients/audit-outbox/audit-outbox.repository';
import {
  BILL_PAYMENT_COMPLETED_EVENT,
  BillPaymentCompletedEvent,
} from './events/bill-payment-completed.event';

// Writes bill-payment events into the durable audit outbox. AuditOutboxRelayJob
// picks pending rows up later and ships them to the Audit service.
@Injectable()
export class BillPaymentEventsAuditListener implements OnModuleInit {
  private readonly logger = new Logger(BillPaymentEventsAuditListener.name);

  constructor(
    private readonly eventBus: InternalEventBusService,
    private readonly outbox: AuditOutboxRepository,
  ) {}

  onModuleInit(): void {
    this.eventBus.on(BILL_PAYMENT_COMPLETED_EVENT, (payload) => {
      const event = payload as BillPaymentCompletedEvent;
      this.outbox
        .save({
          eventType: BILL_PAYMENT_COMPLETED_EVENT,
          payload: { billPaymentId: event.billPaymentId, status: event.status },
          status: 'PENDING',
        })
        .catch((error) =>
          this.logger.error('Failed to write bill payment event to audit outbox', error),
        );
    });
  }
}
