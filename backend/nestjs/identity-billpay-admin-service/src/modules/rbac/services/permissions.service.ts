import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePermissionDto } from '../dto/permission.dto';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
  ) {}

  findAll() {
    return this.permissions.find({ order: { module: 'ASC', action: 'ASC' } });
  }

  async create(dto: CreatePermissionDto) {
    const existing = await this.permissions.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Permission ${dto.code} already exists`);
    }

    const permission = await this.permissions.save(
      this.permissions.create({
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        module: dto.module,
        action: dto.action,
        isActive: true,
        highRisk: dto.highRisk ?? false,
      }),
    );

    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description,
      module: permission.module,
      action: permission.action,
      isActive: permission.isActive,
      highRisk: permission.highRisk,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}
