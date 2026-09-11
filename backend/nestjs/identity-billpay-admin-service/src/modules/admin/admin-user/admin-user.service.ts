import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extractRealmRoles } from '../../rbac/constants/rbac.constants';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { AdminUser } from './entities/admin-user.entity';

const VIEW_ROLES = ['BANK_SUPER_ADMIN', 'BANK_ADMIN'];

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repository: Repository<AdminUser>,
  ) {}

  // PUBLIC — no role check here, because POST /admin/admin-user/list was made public
  // (see admin-user.controller.ts). Before production, take `actor` back as a
  // parameter and call this.assertCanView(actor) first, like findOne() does.
  findAll(query: ListAdminUsersDto) {
    const qb = this.repository.createQueryBuilder('admin_user').orderBy('admin_user.createdAt', 'DESC');

    if (query.role) {
      qb.andWhere('admin_user.roleName = :role', { role: query.role });
    }
    if (query.search) {
      qb.andWhere('(admin_user.username LIKE :search OR admin_user.email LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string, actor: Record<string, unknown>) {
    this.assertCanView(actor);
    const adminUser = await this.repository.findOne({ where: { id } });
    if (!adminUser) {
      throw new NotFoundException('Admin user not found');
    }
    return adminUser;
  }

  private assertCanView(actor: Record<string, unknown>): void {
    const roles = extractRealmRoles(actor);
    if (!roles.some((role) => VIEW_ROLES.includes(role))) {
      throw new ForbiddenException('Only bank admin or bank super admin users can view admin users');
    }
  }
}
