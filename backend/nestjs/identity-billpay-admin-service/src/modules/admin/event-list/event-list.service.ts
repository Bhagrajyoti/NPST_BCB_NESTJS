import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditOutboxRepository } from '../../../clients/audit-outbox/audit-outbox.repository';
import { isSuperadmin } from '../../rbac/constants/rbac.constants';
import { ListEventsDto } from './dto/list-events.dto';

const DEFAULT_LIMIT = 50;

// TEMPORARY — remove before production (see ./README.md).
// Read-only view over the audit_outbox table, so recorded events can be checked
// from Swagger without opening MySQL. It never writes, sends or changes an event.
@Injectable()
export class EventListService {
  constructor(private readonly outbox: AuditOutboxRepository) {}

  findAll(query: ListEventsDto, actor: Record<string, unknown>) {
    this.assertCanView(actor);
    return this.outbox.findRecent({
      eventType: query.eventType,
      status: query.status,
      limit: query.limit ?? DEFAULT_LIMIT,
    });
  }

  private assertCanView(actor: Record<string, unknown>): void {
    if (!isSuperadmin(actor)) {
      throw new ForbiddenException('Only bank super admin users can view the event list');
    }
  }
}
