import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillSchedule } from './entities/bill-schedule.entity';

@Injectable()
export class BillScheduleService {
  constructor(
    @InjectRepository(BillSchedule)
    private readonly repository: Repository<BillSchedule>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<BillSchedule>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
