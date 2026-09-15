import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';

describe('AdminUserService', () => {
  let service: AdminUserService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
  };

  const superAdmin = { sub: 'actor-super', realm_access: { roles: ['BANK_SUPER_ADMIN'] } };
  const bankAdmin = { sub: 'actor-admin', realm_access: { roles: ['BANK_ADMIN'] } };
  const bankMaker = { sub: 'actor-maker', realm_access: { roles: ['BANK_MAKER'] } };

  beforeEach(() => {
    repository = {
      find: jest.fn().mockResolvedValue([{ id: 'admin-user-1' }]),
      findOne: jest.fn(),
    };
    service = new AdminUserService(repository as any);
  });

  describe('findAll', () => {
    it('rejects an actor without BANK_SUPER_ADMIN', () => {
      expect(() => service.findAll(bankMaker)).toThrow(ForbiddenException);
    });

    it('rejects BANK_ADMIN — listing is super-admin only', () => {
      expect(() => service.findAll(bankAdmin)).toThrow(ForbiddenException);
    });

    it('allows BANK_SUPER_ADMIN and returns every row, ordered by createdAt DESC', async () => {
      const result = await service.findAll(superAdmin);
      expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
      expect(result).toEqual([{ id: 'admin-user-1' }]);
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
