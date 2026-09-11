import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { ListEventsDto } from './dto/list-events.dto';
import { EventListService } from './event-list.service';

// TEMPORARY — for checking recorded events during development. Remove this whole
// folder and its lines in admin.module.ts before production (see ./README.md).
@ApiTags('Admin — Events (TEMPORARY)')
@Controller('admin/events')
export class EventListController {
  constructor(private readonly service: EventListService) {}

  // A plain GET with no body: the caller is identified from the Bearer token alone,
  // and every filter is an optional query parameter.
  @Get('list')
  @Auth('BANK_SUPER_ADMIN')
  @ApiOperation({
    summary: 'List recorded events (TEMPORARY — BANK_SUPER_ADMIN only)',
    description:
      'Read-only view of the audit_outbox table, newest first. Just click Execute — no body ' +
      'needed; who you are comes from the Bearer token. Optional filters: eventType, status, ' +
      'limit. Development aid only — will be removed before production.',
  })
  @ApiResponse({ status: 200, description: 'Recorded events, newest first' })
  @ApiResponse({ status: 401, description: 'No token, or the token has expired' })
  @ApiResponse({ status: 403, description: 'Caller is not BANK_SUPER_ADMIN' })
  list(@Query() query: ListEventsDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findAll(query, actor);
  }
}
