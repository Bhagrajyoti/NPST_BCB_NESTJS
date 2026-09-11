import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RegistrationOrchestratorService, RegistrationStep } from './registration-orchestrator.service';

describe('RegistrationOrchestratorService', () => {
  let service: RegistrationOrchestratorService;
  let attempts: { findOne: jest.Mock; save: jest.Mock };
  let compensation: { rollback: jest.Mock };

  const attempt = (currentStep: RegistrationStep) => ({
    id: 'attempt-1',
    currentStep,
    failureReason: null as string | null,
  });

  beforeEach(() => {
    attempts = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    compensation = { rollback: jest.fn().mockResolvedValue(undefined) };
    service = new RegistrationOrchestratorService(attempts as any, compensation as any);
  });

  describe('resume', () => {
    it('throws NotFoundException for an unknown attempt', async () => {
      attempts.findOne.mockResolvedValue(null);
      await expect(service.resume('missing')).rejects.toThrow(NotFoundException);
    });

    it.each([
      [RegistrationStep.INIT, 'POST /auth/otp/create then /auth/registration/verify-otp'],
      [RegistrationStep.OTP_VERIFIED, 'POST /auth/registration/create-credentials'],
      [RegistrationStep.KEYCLOAK_USER_CREATED, 'POST /auth/registration/register-device'],
      [RegistrationStep.DEVICE_REGISTERED, 'POST /auth/registration/complete'],
      [RegistrationStep.COMPLETED, 'Registration already complete — POST /auth/login'],
    ])('returns a distinct nextAction for %s', async (step, expected) => {
      attempts.findOne.mockResolvedValue(attempt(step));
      const result = await service.resume('attempt-1');
      expect(result).toEqual({ attemptId: 'attempt-1', currentStep: step, nextAction: expected });
    });
  });

  describe('advance', () => {
    it('throws NotFoundException for an unknown attempt', async () => {
      attempts.findOne.mockResolvedValue(null);
      await expect(service.advance('missing', RegistrationStep.OTP_VERIFIED)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('moves the attempt forward one step', async () => {
      attempts.findOne.mockResolvedValue(attempt(RegistrationStep.INIT));
      const result = await service.advance('attempt-1', RegistrationStep.OTP_VERIFIED);
      expect(result.currentStep).toBe(RegistrationStep.OTP_VERIFIED);
      expect(attempts.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: RegistrationStep.OTP_VERIFIED }),
      );
    });

    it('rejects skipping a step', async () => {
      attempts.findOne.mockResolvedValue(attempt(RegistrationStep.INIT));
      await expect(service.advance('attempt-1', RegistrationStep.KEYCLOAK_USER_CREATED)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects moving backwards', async () => {
      attempts.findOne.mockResolvedValue(attempt(RegistrationStep.CREDENTIALS_SET));
      await expect(service.advance('attempt-1', RegistrationStep.OTP_VERIFIED)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects re-entering the same step', async () => {
      attempts.findOne.mockResolvedValue(attempt(RegistrationStep.OTP_VERIFIED));
      await expect(service.advance('attempt-1', RegistrationStep.OTP_VERIFIED)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('fail', () => {
    it('records the failure reason and delegates to compensation.rollback', async () => {
      const record = attempt(RegistrationStep.CREDENTIALS_SET);
      attempts.findOne.mockResolvedValue(record);

      await service.fail('attempt-1', RegistrationStep.CREDENTIALS_SET, 'Keycloak unreachable');

      expect(attempts.save).toHaveBeenCalledWith(
        expect.objectContaining({ failureReason: 'Keycloak unreachable' }),
      );
      expect(compensation.rollback).toHaveBeenCalledWith('attempt-1', RegistrationStep.CREDENTIALS_SET);
    });

    it('still rolls back even if the attempt row is already gone', async () => {
      attempts.findOne.mockResolvedValue(null);
      await service.fail('missing', RegistrationStep.DEVICE_REGISTERED, 'boom');
      expect(attempts.save).not.toHaveBeenCalled();
      expect(compensation.rollback).toHaveBeenCalledWith('missing', RegistrationStep.DEVICE_REGISTERED);
    });
  });
});
