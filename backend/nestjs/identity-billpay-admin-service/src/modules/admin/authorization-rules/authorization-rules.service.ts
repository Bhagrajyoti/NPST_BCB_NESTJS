import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationRule } from './entities/authorization-rule.entity';

@Injectable()
export class AuthorizationRulesService {
  constructor(
    @InjectRepository(AuthorizationRule)
    private readonly repository: Repository<AuthorizationRule>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<AuthorizationRule>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
