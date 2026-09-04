import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationAttempt } from './entities/registration-attempt.entity';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(RegistrationAttempt)
    private readonly repository: Repository<RegistrationAttempt>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<RegistrationAttempt>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
