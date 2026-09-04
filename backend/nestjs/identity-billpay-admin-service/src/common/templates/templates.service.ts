import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly repository: Repository<NotificationTemplate>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<NotificationTemplate>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
