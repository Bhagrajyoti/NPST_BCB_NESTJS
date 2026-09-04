import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class RegistrationOrchestratorService {
  private readonly logger = new Logger(RegistrationOrchestratorService.name);

  constructor(
    @InjectRepository(RegistrationAttempt)
    private readonly attempts: Repository<RegistrationAttempt>,
    private readonly compensation: RegistrationCompensationService,
  ) {}

  async resume(attemptId: string): Promise<RegistrationAttempt | null> {
    const attempt = await this.attempts.findOne({ where: { id: attemptId } as any });
    if (!attempt) return null;

    switch (attempt.currentStep) {
      case RegistrationStep.INIT:
      // fall through to next step handler
      default:
        this.logger.debug(`Resuming attempt ${attemptId} at ${attempt.currentStep}`);
        return attempt;
    }
  }

  async fail(attemptId: string, atStep: RegistrationStep): Promise<void> {
    await this.compensation.rollback(attemptId, atStep);
  }
}
