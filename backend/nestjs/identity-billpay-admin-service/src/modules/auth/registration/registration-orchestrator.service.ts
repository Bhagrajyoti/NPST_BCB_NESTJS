import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationAttempt } from './entities/registration-attempt.entity';
import { RegistrationCompensationService } from './registration-compensation.service';

// Resumable saga over registration-attempt.currentStep. Each step is
// idempotent and can be re-entered after a crash/restart.
export enum RegistrationStep {
  INIT = 'INIT',
  OTP_VERIFIED = 'OTP_VERIFIED',
  CREDENTIALS_SET = 'CREDENTIALS_SET',
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
  KEYCLOAK_USER_CREATED = 'KEYCLOAK_USER_CREATED',
  COMPLETED = 'COMPLETED',
}

// Forward order of the saga — also doubles as the legality check for advance(). Deliberately
// puts KEYCLOAK_USER_CREATED before DEVICE_REGISTERED (the reverse of the enum's declaration
// order above): registering a device needs a keycloakUserId to attach it to, and this
// implementation creates the Keycloak user as part of the create-credentials step (see
// RegistrationController.createCredentials), immediately after OTP verification.
const STEP_ORDER: RegistrationStep[] = [
  RegistrationStep.INIT,
  RegistrationStep.OTP_VERIFIED,
  RegistrationStep.CREDENTIALS_SET,
  RegistrationStep.KEYCLOAK_USER_CREATED,
  RegistrationStep.DEVICE_REGISTERED,
  RegistrationStep.COMPLETED,
];

const NEXT_ACTION: Record<RegistrationStep, string> = {
  [RegistrationStep.INIT]: 'POST /auth/otp/create then /auth/registration/verify-otp',
  [RegistrationStep.OTP_VERIFIED]: 'POST /auth/registration/create-credentials',
  [RegistrationStep.CREDENTIALS_SET]:
    'Keycloak user provisioning did not complete — retry POST /auth/registration/create-credentials',
  [RegistrationStep.KEYCLOAK_USER_CREATED]: 'POST /auth/registration/register-device',
  [RegistrationStep.DEVICE_REGISTERED]: 'POST /auth/registration/complete',
  [RegistrationStep.COMPLETED]: 'Registration already complete — POST /auth/login',
};

export interface ResumeResult {
  attemptId: string;
  currentStep: RegistrationStep;
  nextAction: string;
}

@Injectable()
export class RegistrationOrchestratorService {
  private readonly logger = new Logger(RegistrationOrchestratorService.name);

  constructor(
    @InjectRepository(RegistrationAttempt)
    private readonly attempts: Repository<RegistrationAttempt>,
    private readonly compensation: RegistrationCompensationService,
  ) {}

  async resume(attemptId: string): Promise<ResumeResult> {
    const attempt = await this.attempts.findOne({ where: { id: attemptId } });
    if (!attempt) {
      throw new NotFoundException('Registration attempt not found');
    }

    const currentStep = attempt.currentStep as RegistrationStep;
    this.logger.debug(`Resuming attempt ${attemptId} at ${currentStep}`);

    return {
      attemptId,
      currentStep,
      nextAction: NEXT_ACTION[currentStep] ?? NEXT_ACTION[RegistrationStep.INIT],
    };
  }

  /**
   * Persists a forward-only step transition. Rejects going backwards or skipping a step —
   * callers advance one step at a time as each piece of the saga actually completes.
   */
  async advance(attemptId: string, toStep: RegistrationStep): Promise<RegistrationAttempt> {
    const attempt = await this.attempts.findOne({ where: { id: attemptId } });
    if (!attempt) {
      throw new NotFoundException('Registration attempt not found');
    }

    const fromIndex = STEP_ORDER.indexOf(attempt.currentStep as RegistrationStep);
    const toIndex = STEP_ORDER.indexOf(toStep);

    // Exactly one step forward — not just "any later step" — so a caller can't skip e.g.
    // CREDENTIALS_SET straight to COMPLETED without the intermediate steps actually running.
    if (toIndex !== fromIndex + 1) {
      throw new BadRequestException(
        `Cannot move attempt ${attemptId} from ${attempt.currentStep} to ${toStep}`,
      );
    }

    attempt.currentStep = toStep;
    return this.attempts.save(attempt);
  }

  async fail(attemptId: string, atStep: RegistrationStep, reason: string): Promise<void> {
    const attempt = await this.attempts.findOne({ where: { id: attemptId } });
    if (attempt) {
      attempt.failureReason = reason;
      await this.attempts.save(attempt);
    }
    await this.compensation.rollback(attemptId, atStep);
  }
}
