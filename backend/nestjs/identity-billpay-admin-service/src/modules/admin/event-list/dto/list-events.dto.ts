import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const OUTBOX_STATUSES = ['PENDING', 'SENT', 'FAILED'] as const;

// Event names written to audit_outbox today. Listed here only so Swagger can offer a
// dropdown — validation stays a plain string check so a new event type still works.
const KNOWN_EVENT_TYPES = [
  'admin.action.audited',
  'auth.user.registered',
  'auth.user.deactivated',
  'bill-payment.completed',
];

// All fields are optional query parameters: GET /admin/events/list with none of them
// returns the newest 50 events of every type.
export class ListEventsDto {
  @ApiPropertyOptional({
    enum: KNOWN_EVENT_TYPES,
    description: 'Only show one kind of event. Leave empty for all types.',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    enum: OUTBOX_STATUSES,
    description: 'Only show rows in this relay state. Leave empty for all.',
  })
  @IsOptional()
  @IsIn(OUTBOX_STATUSES)
  status?: (typeof OUTBOX_STATUSES)[number];

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 200,
    description: 'How many rows to return, newest first. Leave empty for 50.',
  })
  @IsOptional()
  // Query-string values always arrive as text ("50"); turn them into a number first.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
