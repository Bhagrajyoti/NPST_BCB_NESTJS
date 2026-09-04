import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CifLink } from './entities/cif-link.entity';

@Injectable()
export class CifLinkingService {
  constructor(
    @InjectRepository(CifLink)
    private readonly repository: Repository<CifLink>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<CifLink>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
