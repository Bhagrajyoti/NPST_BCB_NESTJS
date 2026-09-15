import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { OtpService } from './otp.service';

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

describe('OtpService', () => {
  let service: OtpService;
  let repository: { findOne: jest.Mock; save: jest.Mock; softDelete: jest.Mock };

  const challenge = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'challenge-1',
    mobileNumber: '9876543210',
    otpHash: hashOtp('111111'),
    attemptCount: 0,
    lockedUntil: null as Date | null,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  });

  beforeEach(() => {
    process.env.OTP_MAX_ATTEMPTS = '3';
    process.env.OTP_LOCK_MINUTES = '15';
    repository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    service = new OtpService(repository as any);
  });

  describe('verify', () => {
    it('throws NotFoundException for an unknown challenge', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.verify({ challengeId: 'missing', otp: '111111' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a correct code once the challenge has expired', async () => {
      repository.findOne.mockResolvedValue(challenge({ expiresAt: new Date(Date.now() - 1000) }));
      await expect(service.verify({ challengeId: 'challenge-1', otp: '111111' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects any attempt while locked, even with the correct code', async () => {
      repository.findOne.mockResolvedValue(
        challenge({ lockedUntil: new Date(Date.now() + 60_000) }),
      );
      await expect(service.verify({ challengeId: 'challenge-1', otp: '111111' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows a retry once a lock has expired', async () => {
      repository.findOne.mockResolvedValue(
        challenge({ lockedUntil: new Date(Date.now() - 1000) }),
      );
      await expect(
        service.verify({ challengeId: 'challenge-1', otp: '111111' }),
      ).resolves.toEqual({ verified: true, mobileNumber: '9876543210' });
    });

    it('increments attemptCount on a wrong code without locking below the threshold', async () => {
      repository.findOne.mockResolvedValue(challenge({ attemptCount: 0 }));
      await expect(service.verify({ challengeId: 'challenge-1', otp: '000000' })).rejects.toThrow(
        BadRequestException,
      );
      const saved = repository.save.mock.calls[0][0];
      expect(saved.attemptCount).toBe(1);
      expect(saved.lockedUntil).toBeNull();
    });

    it('locks the challenge once attemptCount reaches OTP_MAX_ATTEMPTS', async () => {
      repository.findOne.mockResolvedValue(challenge({ attemptCount: 2 })); // 3rd wrong attempt
      await expect(service.verify({ challengeId: 'challenge-1', otp: '000000' })).rejects.toThrow(
        BadRequestException,
      );
      const saved = repository.save.mock.calls[0][0];
      expect(saved.attemptCount).toBe(3);
      expect(saved.lockedUntil).toBeInstanceOf(Date);
    });

    it('soft-deletes the challenge on a correct code (one-time use)', async () => {
      repository.findOne.mockResolvedValue(challenge());
      await service.verify({ challengeId: 'challenge-1', otp: '111111' });
      expect(repository.softDelete).toHaveBeenCalledWith('challenge-1');
    });
  });
});
