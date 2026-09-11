import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CredentialService } from './credential.service';

describe('CredentialService', () => {
  let service: CredentialService;
  let repository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; softDelete: jest.Mock };
  let keycloakService: { resetUserPassword: jest.Mock };

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'cred-1', ...entity })),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    keycloakService = { resetUserPassword: jest.fn().mockResolvedValue(undefined) };
    service = new CredentialService(repository as any, keycloakService as any);
  });

  describe('create', () => {
    it('rejects when neither password nor mpin is given', async () => {
      await expect(service.create({ userId: 'u1' } as any)).rejects.toThrow(BadRequestException);
    });

    it('never persists the plaintext MPIN — only a scrypt hash', async () => {
      repository.findOne.mockResolvedValue(null);
      await service.create({ userId: 'u1', mpin: '1234' } as any);

      const saved = repository.save.mock.calls[0][0];
      expect(saved.hashedMpin).not.toBe('1234');
      expect(saved.hashedMpin).toMatch(/^scrypt:/);
    });

    it('routes password changes to Keycloak, never stores them locally', async () => {
      const result = await service.create({ userId: 'u1', password: 'MySecurePass@123' } as any);
      expect(keycloakService.resetUserPassword).toHaveBeenCalledWith('u1', 'MySecurePass@123');
      expect(result.passwordUpdated).toBe(true);
      expect(result.mpin).toBeNull();
      // Nothing password-shaped ever reaches the local repository.
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('verifyMpin', () => {
    it('returns false when the user has no stored credential', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.verifyMpin('u1', '1234')).resolves.toBe(false);
    });

    it('accepts the correct MPIN against its own hash', async () => {
      const created = await service.create({ userId: 'u1', mpin: '1234' } as any);
      repository.findOne.mockResolvedValue({
        keycloakUserId: 'u1',
        hashedMpin: repository.save.mock.calls[0][0].hashedMpin,
      });
      await expect(service.verifyMpin('u1', '1234')).resolves.toBe(true);
      expect(created.mpin?.hasMpin).toBe(true);
    });

    it('rejects an incorrect MPIN', async () => {
      await service.create({ userId: 'u1', mpin: '1234' } as any);
      repository.findOne.mockResolvedValue({
        keycloakUserId: 'u1',
        hashedMpin: repository.save.mock.calls[0][0].hashedMpin,
      });
      await expect(service.verifyMpin('u1', '9999')).resolves.toBe(false);
    });
  });

  describe('softDeleteByKeycloakUserId', () => {
    it('throws NotFoundException when there is nothing to delete', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.softDeleteByKeycloakUserId('u1')).rejects.toThrow(NotFoundException);
    });
  });
});
