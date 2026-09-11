import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationStep } from './registration-orchestrator.service';
import { RegistrationAttempt } from './entities/registration-attempt.entity';
import { KeycloakService } from '../keycloak/keycloak.service';
import { DeviceService } from '../device/device.service';
import { CredentialService } from '../credential/credential.service';
import { InternalEventBusService } from '../../../internal-events/internal-event-bus.service';
import { USER_DEACTIVATED_EVENT, UserDeactivatedEvent } from '../events/user-deactivated.event';


// Rolls back whatever the orchestrator committed for a given step when a
// later step fails hard (non-retryable).
@Injectable()
export class RegistrationCompensationService {
  private readonly logger = new Logger(RegistrationCompensationService.name);

  constructor(
    @InjectRepository(RegistrationAttempt)
    private readonly attempts: Repository<RegistrationAttempt>,
    private readonly keycloakService: KeycloakService,
    private readonly deviceService: DeviceService,
    private readonly credentialService: CredentialService,
    private readonly eventBus: InternalEventBusService,

  ) {}

  async rollback(attemptId: string, atStep: RegistrationStep): Promise<void> {
    this.logger.warn(`Compensating attempt ${attemptId} from step ${atStep}`);

    const attempt = await this.attempts.findOne({ where: { id: attemptId } });
    if (!attempt) {
      this.logger.warn(`Cannot compensate ${attemptId} — attempt not found`);
      return;
    }

    switch (atStep) {
      case RegistrationStep.DEVICE_REGISTERED:
        if (attempt.deviceProfileId) {
          await this.safely(
            () => this.deviceService.softDelete(attempt.deviceProfileId as string),
            `revoke device profile ${attempt.deviceProfileId}`,
          );
        }
        break;

      case RegistrationStep.KEYCLOAK_USER_CREATED:
        if (attempt.keycloakUserId) {
          // Disable rather than delete: keeps the Keycloak side reversible/auditable
          // instead of destroying identity data an operator might need to inspect.
            await this.safely(async () => {
              await this.keycloakService.disableUser(attempt.keycloakUserId as string);
              this.eventBus.publish(
                USER_DEACTIVATED_EVENT,
                new UserDeactivatedEvent(attempt.keycloakUserId as string, 'REGISTRATION_ROLLED_BACK'),
              );
            }, `disable Keycloak user ${attempt.keycloakUserId}`);

        }
        break;

      case RegistrationStep.CREDENTIALS_SET:
        if (attempt.keycloakUserId) {
          await this.safely(
            () => this.credentialService.softDeleteByKeycloakUserId(attempt.keycloakUserId as string),
            `clear stored credential for ${attempt.keycloakUserId}`,
          );
        }
        break;

      default:
        // OTP_VERIFIED/INIT have no external side effects to undo.
        break;
    }
  }

  private async safely(action: () => Promise<unknown>, description: string): Promise<void> {
    try {
      await action();
    } catch (error) {
      // Compensation itself must not throw — a failed rollback shouldn't mask the original
      // failure that triggered it. Log loudly so it can be reconciled manually.
      this.logger.error(`Failed to ${description}: ${(error as Error).message}`);
    }
  }
}
