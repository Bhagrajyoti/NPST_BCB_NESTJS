import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extractRealmRoles } from '../../rbac/constants/rbac.constants';
import { AdminUser } from './entities/admin-user.entity';

const VIEW_ROLES = ['BANK_SUPER_ADMIN', 'BANK_ADMIN'];
const LIST_ROLES = ['BANK_SUPER_ADMIN'];

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repository: Repository<AdminUser>,
  ) {}

  findAll(actor: Record<string, unknown>) {
    this.assertRole(actor, LIST_ROLES, 'Only bank super admin users can list admin users');
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, actor: Record<string, unknown>) {
    this.assertRole(actor, VIEW_ROLES, 'Only bank admin or bank super admin users can view admin users');
    const adminUser = await this.repository.findOne({ where: { id } });
    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }
    return adminUser;
  }

  private assertRole(actor: Record<string, unknown>, allowed: string[], message: string): void {
    const roles = extractRealmRoles(actor);
    if (!roles.some((role) => allowed.includes(role))) {
      throw new ForbiddenException(message);
    }
  }
}
