import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';

describe('AdminUserService', () => {
  let service: AdminUserService;
  let queryBuilder: {
    orderBy: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };
  let repository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
  };

  const superAdmin = { sub: 'actor-super', realm_access: { roles: ['BANK_SUPER_ADMIN'] } };
  const bankAdmin = { sub: 'actor-admin', realm_access: { roles: ['BANK_ADMIN'] } };
  const bankMaker = { sub: 'actor-maker', realm_access: { roles: ['BANK_MAKER'] } };

  beforeEach(() => {
    queryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'admin-user-1' }]),
    };
    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
    };
    service = new AdminUserService(repository as any);
  });

  describe('findAll', () => {
    it('rejects an actor without BANK_SUPER_ADMIN or BANK_ADMIN', () => {
      expect(() => service.findAll({}, bankMaker)).toThrow(ForbiddenException);
    });

    it('allows BANK_ADMIN and returns the query results', async () => {
      const result = await service.findAll({}, bankAdmin);
      expect(result).toEqual([{ id: 'admin-user-1' }]);
    });

    it('filters by role when provided', async () => {
      await service.findAll({ role: 'BANK_MAKER' }, superAdmin);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('admin_user.roleName = :role', {
        role: 'BANK_MAKER',
      });
    });

    it('filters by search term across username and email', async () => {
      await service.findAll({ search: 'ravi' }, superAdmin);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(admin_user.username LIKE :search OR admin_user.email LIKE :search)',
        { search: '%ravi%' },
      );
    });

    it('applies no filters when none are given', async () => {
      await service.findAll({}, superAdmin);
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('rejects an actor without view access', async () => {
      await expect(service.findOne('id-1', bankMaker)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the record does not exist', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing-id', superAdmin)).rejects.toThrow(NotFoundException);
    });

    it('returns the record when found', async () => {
      repository.findOne.mockResolvedValue({ id: 'admin-user-1' });
      const result = await service.findOne('admin-user-1', bankAdmin);
      expect(result).toEqual({ id: 'admin-user-1' });
    });
  });
});
