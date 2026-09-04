import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorporateHierarchy } from './entities/corporate-hierarchy.entity';

@Injectable()
export class CorporateHierarchyService {
  constructor(
    @InjectRepository(CorporateHierarchy)
    private readonly repository: Repository<CorporateHierarchy>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<CorporateHierarchy>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
