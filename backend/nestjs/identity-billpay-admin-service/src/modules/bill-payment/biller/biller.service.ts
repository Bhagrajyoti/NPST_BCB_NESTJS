import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillerRegistration } from './entities/biller-registration.entity';

@Injectable()
export class BillerService {
  constructor(
    @InjectRepository(BillerRegistration)
    private readonly repository: Repository<BillerRegistration>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<BillerRegistration>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
