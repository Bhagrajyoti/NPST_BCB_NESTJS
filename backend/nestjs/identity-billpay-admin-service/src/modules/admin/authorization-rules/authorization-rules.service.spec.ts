import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthorizationRulesService } from './authorization-rules.service';

describe('AuthorizationRulesService', () => {
  let service: AuthorizationRulesService;
  let rules: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    softDelete: jest.Mock;
  };
  let history: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const superAdmin = { sub: 'actor-super', realm_access: { roles: ['BANK_SUPER_ADMIN'] } };
  const bankAdmin = { sub: 'actor-admin', realm_access: { roles: ['BANK_ADMIN'] } };
  const bankChecker = { sub: 'actor-checker', realm_access: { roles: ['BANK_CHECKER'] } };

  const existingRule = {
    id: 'rule-1',
    ruleName: 'High-value transfer approval',
    cif: 'CIF12345',
    threshold: '500000.00',
    version: 1,
    createdByKeycloakUserId: 'actor-super',
    updatedByKeycloakUserId: null,
  };

  beforeEach(() => {
    rules = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ ...data, id: data.id ?? 'rule-1' })),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    history = {
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };
      service = new AuthorizationRulesService(
      rules as any,
      history as any,
      { publish: jest.fn() } as any,
    );

  });

  describe('findAll', () => {
    it('rejects actors without view access', () => {
      expect(() => service.findAll(bankChecker)).toThrow(ForbiddenException);
    });

    it('allows BANK_ADMIN to list rules', () => {
      rules.find.mockReturnValue([existingRule]);
      expect(service.findAll(bankAdmin)).toEqual([existingRule]);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a missing rule', async () => {
      rules.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing', superAdmin)).rejects.toThrow(NotFoundException);
    });

    it('returns the rule when found', async () => {
      rules.findOne.mockResolvedValue(existingRule);
      await expect(service.findOne('rule-1', bankAdmin)).resolves.toEqual(existingRule);
    });
  });

  describe('findHistory', () => {
    it('returns history ordered by version descending', async () => {
      rules.findOne.mockResolvedValue(existingRule);
      history.find.mockResolvedValue([{ version: 2 }, { version: 1 }]);

      const result = await service.findHistory('rule-1', superAdmin);

      expect(history.find).toHaveBeenCalledWith({
        where: { ruleId: 'rule-1' },
        order: { version: 'DESC' },
      });
      expect(result).toEqual([{ version: 2 }, { version: 1 }]);
    });
  });

  describe('create', () => {
    it('rejects a non-superadmin actor', async () => {
      await expect(
        service.create({ ruleName: 'x', cif: 'CIF1', threshold: '100.00' }, bankAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a rule at version 1 and writes an initial history row', async () => {
      const dto = { ruleName: 'High-value transfer approval', cif: 'CIF12345', threshold: '500000.00' };

      const result = await service.create(dto, superAdmin);

      expect(rules.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...dto, version: 1, createdByKeycloakUserId: 'actor-super' }),
      );
      expect(history.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: result.id,
          version: 1,
          changedByKeycloakUserId: 'actor-super',
          snapshot: { ruleName: dto.ruleName, cif: dto.cif, threshold: dto.threshold },
        }),
      );
    });
  });

  describe('update', () => {
    it('rejects a non-superadmin actor', async () => {
      await expect(service.update({ id: 'rule-1', ruleName: 'x' }, bankAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when the rule does not exist', async () => {
      rules.findOne.mockResolvedValue(null);
      await expect(service.update({ id: 'missing', ruleName: 'x' }, superAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('increments the version, updates fields, and records history with the change reason', async () => {
      rules.findOne.mockResolvedValue({ ...existingRule });
      const dto = { id: 'rule-1', threshold: '750000.00', changeReason: 'Risk policy update' };

      const result = await service.update(dto, superAdmin);

      expect(result.version).toBe(2);
      expect(result.threshold).toBe('750000.00');
      expect(result.updatedByKeycloakUserId).toBe('actor-super');
      expect(history.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-1',
          version: 2,
          snapshot: expect.objectContaining({ changeReason: 'Risk policy update' }),
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('rejects a non-superadmin actor', async () => {
      await expect(service.deactivate('rule-1', bankAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the rule does not exist', async () => {
      rules.findOne.mockResolvedValue(null);
      await expect(service.deactivate('missing', superAdmin)).rejects.toThrow(NotFoundException);
    });

    it('writes a final history row and soft-deletes the rule', async () => {
      rules.findOne.mockResolvedValue({ ...existingRule });

      const result = await service.deactivate('rule-1', superAdmin);

      expect(history.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-1',
          version: 2,
          snapshot: expect.objectContaining({ deactivated: true }),
        }),
      );
      expect(rules.softDelete).toHaveBeenCalledWith('rule-1');
      expect(result).toEqual({ id: 'rule-1', deactivated: true });
    });
  });
});
