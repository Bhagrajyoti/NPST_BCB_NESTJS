import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BBPS_CATEGORIES } from '../catalog/bbps-catalog.const';
import { BillerRegistration } from './entities/biller-registration.entity';

@Injectable()
export class BillerService {
  constructor(
    @InjectRepository(BillerRegistration)
    private readonly repository: Repository<BillerRegistration>,
  ) {}

  findAll(category?: string) {
    if (category) {
      return this.repository.find({
        where: { category, active: true },
      });
    }
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  getCategories() {
    return BBPS_CATEGORIES.map((category) => ({
      code: category,
      name: category,
    }));
  }

  create(data: Partial<BillerRegistration>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
