import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { BankAccountService } from './bank-account/bank-account.service';
import { BankAccountSeeder } from './bank-account/bank-account.seeder';
import { BankAccount } from './bank-account/entities/bank-account.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      RegistrationAttempt,
      Credential,
      DeviceProfile,
      CorporateHierarchy,
      OtpChallenge,
      BankAccount,
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
    BankAccountService,
    BankAccountSeeder,
  ],
  exports: [KeycloakService],
})
export class AuthModule {}
