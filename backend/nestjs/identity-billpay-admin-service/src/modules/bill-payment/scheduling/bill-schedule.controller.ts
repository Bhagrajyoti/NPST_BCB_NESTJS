import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';

import { Auth } from '../../../common/decorators/auth.decorator';
import {
  BBPS_SCHEDULE_MUTATION_ROLES,
  BBPS_SCHEDULE_READ_ROLES,
} from '../../rbac/constants/rbac.constants';
import { BillScheduleService } from './bill-schedule.service';
import { CreateBillScheduleDto } from './dto/create-bill-schedule.dto';

@ApiTags('Bill Payment — Schedule')
@Controller('bill-payment/schedule')
export class BillScheduleController {
  constructor(
    private readonly billScheduleService: BillScheduleService,
  ) {}

  @Get()
  @Auth(...BBPS_SCHEDULE_READ_ROLES)
  @ApiOperation({
    summary: 'List bill payment schedules for the authenticated customer',
  })
  findAll(@AuthenticatedUser() actor: Record<string, unknown>) {
    return this.billScheduleService.findAll(actor);
  }

  @Get('upcoming')
  @Auth(...BBPS_SCHEDULE_MUTATION_ROLES)
  @ApiOperation({
    summary: 'List upcoming active schedules for the authenticated customer',
    description:
      'ACTIVE schedules owned by the caller with nextRunAt on or after now, sorted ascending.',
  })
  upcoming(@AuthenticatedUser() actor: Record<string, unknown>) {
    return this.billScheduleService.getUpcomingSchedules(actor);
  }

  @Get(':id/executions')
  @Auth(...BBPS_SCHEDULE_MUTATION_ROLES)
  @ApiOperation({
    summary: 'Execution history for a schedule',
    description: 'Newest executions first. Caller must own the schedule.',
  })
  executions(
    @Param('id') id: string,
    @AuthenticatedUser() actor: Record<string, unknown>,
  ) {
    return this.billScheduleService.getScheduleExecutions(id, actor);
  }

  @Get(':id')
  @Auth(...BBPS_SCHEDULE_READ_ROLES)
  @ApiOperation({ summary: 'Get a bill payment schedule by id' })
  findOne(@Param('id') id: string, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.billScheduleService.findOne(id, actor);
  }

  @Post()
  @Auth(...BBPS_SCHEDULE_MUTATION_ROLES)
  @ApiOperation({
    summary: 'Create bill payment schedule',
    description: 'RETAIL_CUSTOMER, CORPORATE_MAKER, or CORPORATE_IT_ADMIN.',
  })
  create(
    @Body() dto: CreateBillScheduleDto,
    @AuthenticatedUser() actor: Record<string, unknown>,
  ) {
    return this.billScheduleService.create(dto, actor);
  }

  @Post(':id/pause')
  @Auth(...BBPS_SCHEDULE_MUTATION_ROLES)
  @ApiOperation({
    summary: 'Pause an active schedule',
    description: 'ACTIVE → PAUSED. Owner only.',
  })
  pause(@Param('id') id: string, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.billScheduleService.pauseSchedule(id, actor);
  }

  @Post(':id/resume')
  @Auth(...BBPS_SCHEDULE_MUTATION_ROLES)
  @ApiOperation({
    summary: 'Resume a paused schedule',
    description: 'PAUSED → ACTIVE. Owner only.',
  })
  resume(@Param('id') id: string, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.billScheduleService.resumeSchedule(id, actor);
  }

  @Post(':id/cancel')
  @Auth(...BBPS_SCHEDULE_MUTATION_ROLES)
  @ApiOperation({
    summary: 'Cancel a schedule',
    description: 'ACTIVE or PAUSED → CANCELLED. Owner only; row is retained.',
  })
  cancel(@Param('id') id: string, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.billScheduleService.cancelSchedule(id, actor);
  }
}
