import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import {
  assertScheduleOwnedByActor,
  requireActorSub,
} from '../common/bbps-access.util';
import { BillScheduleExecution } from './entities/bill-schedule-execution.entity';
import { BillSchedule } from './entities/bill-schedule.entity';
import { CreateBillScheduleDto } from './dto/create-bill-schedule.dto';
import { ScheduleStatus, TERMINAL_SCHEDULE_STATUSES } from './schedule-status.constant';

@Injectable()
export class BillScheduleService {
  constructor(
    @InjectRepository(BillSchedule)
    private readonly repository: Repository<BillSchedule>,
    @InjectRepository(BillScheduleExecution)
    private readonly executionRepository: Repository<BillScheduleExecution>,
  ) {}

  findAll(actor: Record<string, unknown>) {
    const sub = requireActorSub(actor);
    return this.repository.find({ where: { keycloakUserId: sub } });
  }

  async findOne(id: string, actor: Record<string, unknown>) {
    return this.getOwnedSchedule(id, actor);
  }

  async create(dto: CreateBillScheduleDto, actor: Record<string, unknown>) {
    const keycloakUserId = requireActorSub(actor);
    if (dto.scheduleType === 'RECURRING' && !dto.frequency) {
      throw new BadRequestException(
        'Frequency is required for recurring schedule',
      );
    }

    if (dto.scheduleType === 'ONE_TIME' && dto.frequency) {
      throw new BadRequestException(
        'Frequency should not be provided for one-time schedule',
      );
    }

    const schedule = this.repository.create({
      billerCode: dto.billerCode,
      consumerNumber: dto.consumerNumber,
      scheduleType: dto.scheduleType,
      frequency: dto.frequency,
      nextRunAt: new Date(dto.nextRunAt),
      maximumAmount: dto.maximumAmount,
      active: true,
      status: ScheduleStatus.ACTIVE,
      keycloakUserId,
    });

    return this.repository.save(schedule);
  }

  async pauseSchedule(id: string, actor: Record<string, unknown>) {
    const schedule = await this.getOwnedSchedule(id, actor);

    if (schedule.status === ScheduleStatus.PAUSED) {
      throw new BadRequestException({
        code: 'SCHEDULE_ALREADY_PAUSED',
        message: 'Schedule is already paused',
      });
    }

    if (schedule.status !== ScheduleStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'SCHEDULE_CANNOT_PAUSE',
        message: `Cannot pause a schedule in ${schedule.status} state`,
      });
    }

    schedule.status = ScheduleStatus.PAUSED;
    schedule.active = false;
    return this.repository.save(schedule);
  }

  async resumeSchedule(id: string, actor: Record<string, unknown>) {
    const schedule = await this.getOwnedSchedule(id, actor);

    if (schedule.status === ScheduleStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'SCHEDULE_ALREADY_ACTIVE',
        message: 'Schedule is already active',
      });
    }

    if (schedule.status !== ScheduleStatus.PAUSED) {
      throw new BadRequestException({
        code: 'SCHEDULE_CANNOT_RESUME',
        message: `Cannot resume a schedule in ${schedule.status} state`,
      });
    }

    schedule.status = ScheduleStatus.ACTIVE;
    schedule.active = true;
    return this.repository.save(schedule);
  }

  async cancelSchedule(id: string, actor: Record<string, unknown>) {
    const schedule = await this.getOwnedSchedule(id, actor);

    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new BadRequestException({
        code: 'SCHEDULE_ALREADY_CANCELLED',
        message: 'Schedule is already cancelled',
      });
    }

    if (TERMINAL_SCHEDULE_STATUSES.includes(schedule.status)) {
      throw new BadRequestException({
        code: 'SCHEDULE_CANNOT_CANCEL',
        message: `Cannot cancel a schedule in ${schedule.status} state`,
      });
    }

    if (
      schedule.status !== ScheduleStatus.ACTIVE &&
      schedule.status !== ScheduleStatus.PAUSED
    ) {
      throw new BadRequestException({
        code: 'SCHEDULE_CANNOT_CANCEL',
        message: `Cannot cancel a schedule in ${schedule.status} state`,
      });
    }

    schedule.status = ScheduleStatus.CANCELLED;
    schedule.active = false;
    return this.repository.save(schedule);
  }

  async getScheduleExecutions(id: string, actor: Record<string, unknown>) {
    await this.getOwnedSchedule(id, actor);
    return this.executionRepository.find({
      where: { scheduleId: id },
      order: { createdAt: 'DESC' },
    });
  }

  async getUpcomingSchedules(actor: Record<string, unknown>) {
    const sub = requireActorSub(actor);
    const now = new Date();
    return this.repository.find({
      where: {
        keycloakUserId: sub,
        status: ScheduleStatus.ACTIVE,
        nextRunAt: MoreThanOrEqual(now),
      },
      order: { nextRunAt: 'ASC' },
    });
  }

  private async getOwnedSchedule(
    id: string,
    actor: Record<string, unknown>,
  ): Promise<BillSchedule> {
    const schedule = await this.repository.findOne({
      where: { id },
    });
    if (!schedule) {
      throw new NotFoundException({
        code: 'SCHEDULE_NOT_FOUND',
        message: 'Bill schedule not found',
      });
    }
    assertScheduleOwnedByActor(schedule, actor);
    return schedule;
  }
}
