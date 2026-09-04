import { Injectable, Logger } from '@nestjs/common';
import { RegistrationStep } from './registration-orchestrator.service';

// Rolls back whatever the orchestrator committed for a given step when a
// later step fails hard (non-retryable).
@Injectable()
export class RegistrationCompensationService {
  private readonly logger = new Logger(RegistrationCompensationService.name);

  async rollback(attemptId: string, atStep: RegistrationStep): Promise<void> {
    this.logger.warn(`Compensating attempt ${attemptId} from step ${atStep}`);

    switch (atStep) {
      case RegistrationStep.KEYCLOAK_USER_CREATED:
        // TODO: disable/delete the Keycloak user created for this attempt
        break;
      case RegistrationStep.DEVICE_REGISTERED:
        // TODO: revoke the device profile
        break;
      case RegistrationStep.CREDENTIALS_SET:
        // TODO: clear stored credential
        break;
      default:
        break;
    }
  }
}
