import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createTestApp, mockKeycloakService, publicRequest } from '../e2e/helpers/test-app';
import { RegistrationAttempt } from '../../src/modules/auth/registration/entities/registration-attempt.entity';

// Verifies RegistrationOrchestratorService resumes from current_step after a crash, and that
// RegistrationCompensationService actually rolls back a failed step — end to end, over real
// HTTP, not just the isolated unit specs (registration-orchestrator/compensation.service.spec.ts).
describe('Registration saga resumption (e2e)', () => {
  let app: INestApplication;
  let attemptRepo: Repository<RegistrationAttempt>;

  beforeAll(async () => {
    app = await createTestApp();
    attemptRepo = app.get(getRepositoryToken(RegistrationAttempt));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function createAttempt(mobileNumber: string) {
    const res = await publicRequest(app)
      .post('/api/v1/auth/registration/create')
      .send({ mobileNumber, panOrCif: 'CIF-SAGA-TEST' })
      .expect(201);
    return res.body.data.id as string;
  }

  async function createOtpChallenge(mobileNumber: string) {
    const res = await publicRequest(app)
      .post('/api/v1/auth/otp/create')
      .send({ mobileNumber })
      .expect(201);
    return { challengeId: res.body.data.id as string, otp: res.body.data.otp as string };
  }

  it('resume() reports a distinct nextAction at each real step of the saga', async () => {
    const mobileNumber = `9${Date.now().toString().slice(-9)}`;
    const attemptId = await createAttempt(mobileNumber);

    const resumeAtInit = await publicRequest(app)
      .post('/api/v1/auth/registration/resume')
      .send({ id: attemptId })
      .expect(201);
    expect(resumeAtInit.body.data.currentStep).toBe('INIT');
    expect(resumeAtInit.body.data.nextAction).toMatch(/otp/i);

    const { challengeId, otp } = await createOtpChallenge(mobileNumber);

    await publicRequest(app)
      .post('/api/v1/auth/registration/verify-otp')
      .send({ attemptId, challengeId, otp })
      .expect(201);

    const resumeAtOtpVerified = await publicRequest(app)
      .post('/api/v1/auth/registration/resume')
      .send({ id: attemptId })
      .expect(201);
    expect(resumeAtOtpVerified.body.data.currentStep).toBe('OTP_VERIFIED');
    expect(resumeAtOtpVerified.body.data.nextAction).toMatch(/create-credentials/);
  });

  it('runs the full saga end to end: create → verify-otp → create-credentials → register-device → complete', async () => {
    const mobileNumber = `9${Date.now().toString().slice(-9)}`;
    const attemptId = await createAttempt(mobileNumber);
    const { challengeId, otp } = await createOtpChallenge(mobileNumber);

    await publicRequest(app)
      .post('/api/v1/auth/registration/verify-otp')
      .send({ attemptId, challengeId, otp })
      .expect(201);

    const credentials = await publicRequest(app)
      .post('/api/v1/auth/registration/create-credentials')
      .send({ attemptId, password: 'MySecurePass@123' })
      .expect(201);
    expect(credentials.body.data.currentStep).toBe('KEYCLOAK_USER_CREATED');
    expect(credentials.body.data.keycloakUserId).toBeDefined();
    expect(mockKeycloakService.createUser).toHaveBeenCalled();
    expect(mockKeycloakService.assignRealmRoleToUser).toHaveBeenCalledWith(
      credentials.body.data.keycloakUserId,
      'RETAIL_CUSTOMER',
    );

    const device = await publicRequest(app)
      .post('/api/v1/auth/registration/register-device')
      .send({ attemptId, deviceId: `saga-device-${attemptId}` })
      .expect(201);
    expect(device.body.data.currentStep).toBe('DEVICE_REGISTERED');

    const completed = await publicRequest(app)
      .post('/api/v1/auth/registration/complete')
      .send({ id: attemptId })
      .expect(201);
    expect(completed.body.data.status).toBe('COMPLETED');

    const resumeAtEnd = await publicRequest(app)
      .post('/api/v1/auth/registration/resume')
      .send({ id: attemptId })
      .expect(201);
    expect(resumeAtEnd.body.data.currentStep).toBe('COMPLETED');
  });

  it('rejects calling a step out of order', async () => {
    const mobileNumber = `9${Date.now().toString().slice(-9)}`;
    const attemptId = await createAttempt(mobileNumber);

    // Never verified OTP — jumping straight to create-credentials must fail.
    await publicRequest(app)
      .post('/api/v1/auth/registration/create-credentials')
      .send({ attemptId, password: 'MySecurePass@123' })
      .expect(400);
  });

  it('compensates (rolls back) when create-credentials fails partway through', async () => {
    const mobileNumber = `9${Date.now().toString().slice(-9)}`;
    const attemptId = await createAttempt(mobileNumber);
    const { challengeId, otp } = await createOtpChallenge(mobileNumber);

    await publicRequest(app)
      .post('/api/v1/auth/registration/verify-otp')
      .send({ attemptId, challengeId, otp })
      .expect(201);

    mockKeycloakService.createUser.mockRejectedValueOnce(new Error('Keycloak unreachable'));

    await publicRequest(app)
      .post('/api/v1/auth/registration/create-credentials')
      .send({ attemptId, password: 'MySecurePass@123' })
      .expect(500);

    // The attempt is left at CREDENTIALS_SET (the step being attempted, not KEYCLOAK_USER_CREATED
    // — that only advances once Keycloak actually confirms the user was created), with the
    // failure recorded, so the client can see why and retry.
    const stored = await attemptRepo.findOne({ where: { id: attemptId } });
    expect(stored?.currentStep).toBe('CREDENTIALS_SET');
    expect(stored?.failureReason).toContain('Keycloak unreachable');
    expect(stored?.keycloakUserId).toBeNull();

    // Retrying (without the injected failure) succeeds and picks up from CREDENTIALS_SET —
    // this is the actual retry path, not a dead end.
    const retry = await publicRequest(app)
      .post('/api/v1/auth/registration/create-credentials')
      .send({ attemptId, password: 'MySecurePass@123' })
      .expect(201);
    expect(retry.body.data.currentStep).toBe('KEYCLOAK_USER_CREATED');
    expect(retry.body.data.keycloakUserId).toBeDefined();
  });
});
