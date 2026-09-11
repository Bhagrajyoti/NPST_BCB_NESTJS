import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalEventBusModule } from '../../internal-events/internal-event-bus.module';
import { AuditOutboxModule } from '../../clients/audit-outbox/audit-outbox.module';
import { AuthEventsAuditListener } from './auth-events-audit.listener';
import { RegistrationController } from './registration/registration.controller';
import { RegistrationService } from './registration/registration.service';
import { RegistrationOrchestratorService } from './registration/registration-orchestrator.service';
import { RegistrationCompensationService } from './registration/registration-compensation.service';
import { RegistrationAttempt } from './registration/entities/registration-attempt.entity';
import { CredentialController } from './credential/credential.controller';
import { CredentialService } from './credential/credential.service';
import { Credential } from './credential/entities/credential.entity';
import { DeviceController } from './device/device.controller';
import { DeviceService } from './device/device.service';
import { DeviceProfile } from './device/entities/device-profile.entity';
import { CorporateHierarchyController } from './corporate-hierarchy/corporate-hierarchy.controller';
import { AuthController } from './token/auth.controller';
import { CorporateHierarchyService } from './corporate-hierarchy/corporate-hierarchy.service';
import { CorporateHierarchy } from './corporate-hierarchy/entities/corporate-hierarchy.entity';
import { OtpController } from './otp/otp.controller';
import { OtpService } from './otp/otp.service';
import { OtpChallenge } from './otp/entities/otp-challenge.entity';
import { KeycloakService } from './keycloak/keycloak.service';

@Module({
  imports: [
    HttpModule,
    InternalEventBusModule,
    AuditOutboxModule,
    TypeOrmModule.forFeature([
      RegistrationAttempt,
      Credential,
      DeviceProfile,
      CorporateHierarchy,
      OtpChallenge,
    ]),
  ],
  controllers: [
    RegistrationController,
    CredentialController,
    DeviceController,
    CorporateHierarchyController,
    OtpController,
    AuthController,
  ],
  providers: [
    RegistrationService,
    RegistrationOrchestratorService,
    RegistrationCompensationService,
    CredentialService,
    DeviceService,
    CorporateHierarchyService,
    OtpService,
    KeycloakService,
    AuthEventsAuditListener,
  ],
  exports: [KeycloakService],
})
export class AuthModule {}
