import { RegistrationCompensationService } from './registration-compensation.service';
import { RegistrationStep } from './registration-orchestrator.service';

describe('RegistrationCompensationService', () => {
  let service: RegistrationCompensationService;
  let attempts: { findOne: jest.Mock };
  let keycloakService: { disableUser: jest.Mock };
  let deviceService: { softDelete: jest.Mock };
  let credentialService: { softDeleteByKeycloakUserId: jest.Mock };

  const baseAttempt = {
    id: 'attempt-1',
    keycloakUserId: 'kc-user-1',
    deviceProfileId: 'device-1',
  };

  beforeEach(() => {
    attempts = { findOne: jest.fn() };
    keycloakService = { disableUser: jest.fn().mockResolvedValue(undefined) };
    deviceService = { softDelete: jest.fn().mockResolvedValue(undefined) };
    credentialService = { softDeleteByKeycloakUserId: jest.fn().mockResolvedValue(undefined) };
    service = new RegistrationCompensationService(
      attempts as any,
      keycloakService as any,
      deviceService as any,
      credentialService as any,
    );
  });

  it('does nothing (and does not throw) when the attempt no longer exists', async () => {
    attempts.findOne.mockResolvedValue(null);
    await service.rollback('missing', RegistrationStep.KEYCLOAK_USER_CREATED);
    expect(keycloakService.disableUser).not.toHaveBeenCalled();
  });

  it('disables the Keycloak user when rolling back from KEYCLOAK_USER_CREATED', async () => {
    attempts.findOne.mockResolvedValue(baseAttempt);
    await service.rollback('attempt-1', RegistrationStep.KEYCLOAK_USER_CREATED);
    expect(keycloakService.disableUser).toHaveBeenCalledWith('kc-user-1');
  });

  it('revokes the device profile when rolling back from DEVICE_REGISTERED', async () => {
    attempts.findOne.mockResolvedValue(baseAttempt);
    await service.rollback('attempt-1', RegistrationStep.DEVICE_REGISTERED);
    expect(deviceService.softDelete).toHaveBeenCalledWith('device-1');
  });

  it('clears the stored credential when rolling back from CREDENTIALS_SET', async () => {
    attempts.findOne.mockResolvedValue(baseAttempt);
    await service.rollback('attempt-1', RegistrationStep.CREDENTIALS_SET);
    expect(credentialService.softDeleteByKeycloakUserId).toHaveBeenCalledWith('kc-user-1');
  });

  it('does nothing for steps with no external side effects (INIT/OTP_VERIFIED)', async () => {
    attempts.findOne.mockResolvedValue(baseAttempt);
    await service.rollback('attempt-1', RegistrationStep.OTP_VERIFIED);
    expect(keycloakService.disableUser).not.toHaveBeenCalled();
    expect(deviceService.softDelete).not.toHaveBeenCalled();
    expect(credentialService.softDeleteByKeycloakUserId).not.toHaveBeenCalled();
  });

  it('skips a step-specific action when its id was never recorded on the attempt', async () => {
    attempts.findOne.mockResolvedValue({ ...baseAttempt, keycloakUserId: null });
    await service.rollback('attempt-1', RegistrationStep.KEYCLOAK_USER_CREATED);
    expect(keycloakService.disableUser).not.toHaveBeenCalled();
  });

  it('swallows a compensation failure instead of throwing (logs and moves on)', async () => {
    attempts.findOne.mockResolvedValue(baseAttempt);
    keycloakService.disableUser.mockRejectedValue(new Error('Keycloak unreachable'));
    await expect(
      service.rollback('attempt-1', RegistrationStep.KEYCLOAK_USER_CREATED),
    ).resolves.toBeUndefined();
  });
});
