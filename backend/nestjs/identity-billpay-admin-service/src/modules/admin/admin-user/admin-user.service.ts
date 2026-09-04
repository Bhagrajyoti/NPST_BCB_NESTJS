import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from './entities/admin-user.entity';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repository: Repository<AdminUser>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<AdminUser>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
