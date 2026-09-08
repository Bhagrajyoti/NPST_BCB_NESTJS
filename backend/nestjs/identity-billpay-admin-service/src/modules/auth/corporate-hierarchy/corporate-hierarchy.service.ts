import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorporateHierarchy } from './entities/corporate-hierarchy.entity';
import { SetHierarchyRoleDto } from './dto/set-hierarchy-role.dto';

@Injectable()
export class CorporateHierarchyService {
  constructor(
    @InjectRepository(CorporateHierarchy)
    private readonly repository: Repository<CorporateHierarchy>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Corporate hierarchy record not found');
    }
    return record;
  }

  create(dto: SetHierarchyRoleDto) {
    const entity = this.repository.create({
      userId: dto.userId,
      cif: dto.cif,
      role: dto.role,
    });
    return this.repository.save(entity);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
