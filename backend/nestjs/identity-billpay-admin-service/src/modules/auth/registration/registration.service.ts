import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationAttempt } from './entities/registration-attempt.entity';
import { InitRegistrationDto } from './dto/init-registration.dto';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto';
import { CreateCredentialsDto } from './dto/create-credentials.dto';
import { RegisterAttemptDeviceDto } from './dto/register-attempt-device.dto';
import { ActivateMobileDto } from './dto/activate-mobile.dto';
import { RegistrationOrchestratorService, RegistrationStep } from './registration-orchestrator.service';
import { OtpService } from '../otp/otp.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { DeviceService } from '../device/device.service';
import { BankAccountService } from '../bank-account/bank-account.service';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(RegistrationAttempt)
    private readonly repository: Repository<RegistrationAttempt>,
    private readonly orchestrator: RegistrationOrchestratorService,
    private readonly otpService: OtpService,
    private readonly keycloakService: KeycloakService,
    private readonly deviceService: DeviceService,
    private readonly bankAccountService: BankAccountService,
  ) {}

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Registration attempt not found');
    }
    return record;
  }

  /**
   * Step 1: create the attempt and, alongside it, resolve every bank account already on file
   * for this mobile number (mock CBS lookup — see BankAccountService) so the app can show the
   * customer which accounts it found before they continue the saga.
   */
  async create(dto: InitRegistrationDto) {
    const entity = this.repository.create({
      mobileNumber: dto.mobileNumber,
      currentStep: RegistrationStep.INIT,
    });
    const attempt = await this.repository.save(entity);
    const registeredAccounts = await this.bankAccountService.findByMobileNumber(dto.mobileNumber);

    return { ...attempt, registeredAccounts };
  }

  /**
   * Activates a mobile number against one of its registered accounts by proving the caller
   * holds the physical debit card for it (number + expiry + CVV must match bank_account
   * exactly, and that account must actually belong to this mobile number) — see
   * BankAccountService.verifyDebitCard. Not a saga step (no RegistrationAttempt involved);
   * can be called any time a mobile number's registeredAccounts are known.
   */
  async activateMobile(dto: ActivateMobileDto) {
    const account = await this.bankAccountService.verifyDebitCard(dto);
    return {
      success: true,
      message: 'Successfully connected',
      account,
    };
  }

  private requireStep(attempt: RegistrationAttempt, expected: RegistrationStep): void {
    if (attempt.currentStep !== expected) {
      throw new BadRequestException(
        `Registration attempt ${attempt.id} is at ${attempt.currentStep}, expected ${expected}`,
      );
    }
  }

  /** Step 2: verify the OTP sent to the attempt's mobile number, advance to OTP_VERIFIED. */
  async verifyOtp(dto: VerifyRegistrationOtpDto) {
    const attempt = await this.findOne(dto.attemptId);
    this.requireStep(attempt, RegistrationStep.INIT);

    await this.otpService.verify({ challengeId: dto.challengeId, otp: dto.otp });

    return this.orchestrator.advance(dto.attemptId, RegistrationStep.OTP_VERIFIED);
  }

  /**
   * Step 3: set the login password and provision the real Keycloak user. Marks
   * CREDENTIALS_SET immediately (the step being attempted), then KEYCLOAK_USER_CREATED once
   * the Keycloak call actually succeeds — if it fails partway, the attempt is compensated back
   * out via RegistrationOrchestratorService.fail(), but is deliberately left *at* CREDENTIALS_SET
   * (not reset to OTP_VERIFIED) so calling this again is exactly how you retry: accept the
   * attempt at either OTP_VERIFIED (first call) or CREDENTIALS_SET (retry after a prior failure).
   */
  async createCredentials(dto: CreateCredentialsDto) {
    const attempt = await this.findOne(dto.attemptId);
    if (
      attempt.currentStep !== RegistrationStep.OTP_VERIFIED &&
      attempt.currentStep !== RegistrationStep.CREDENTIALS_SET
    ) {
      throw new BadRequestException(
        `Registration attempt ${dto.attemptId} is at ${attempt.currentStep}, expected ` +
          `OTP_VERIFIED, or CREDENTIALS_SET to retry a previously failed attempt`,
      );
    }

    if (attempt.currentStep === RegistrationStep.OTP_VERIFIED) {
      await this.orchestrator.advance(dto.attemptId, RegistrationStep.CREDENTIALS_SET);
    }

    try {
      const keycloakUser = await this.keycloakService.createUser({
        username: attempt.mobileNumber,
        email: `${attempt.mobileNumber}@customer.bharat-banking.local`,
        firstName: 'Customer',
        lastName: attempt.mobileNumber,
        password: dto.password,
      });
      await this.keycloakService.assignRealmRoleToUser(keycloakUser.id, 'RETAIL_CUSTOMER');

      const updated = await this.findOne(dto.attemptId);
      updated.keycloakUserId = keycloakUser.id;
      await this.repository.save(updated);

      return this.orchestrator.advance(dto.attemptId, RegistrationStep.KEYCLOAK_USER_CREATED);
    } catch (error) {
      await this.orchestrator.fail(
        dto.attemptId,
        RegistrationStep.CREDENTIALS_SET,
        (error as Error).message,
      );
      throw error;
    }
  }

  /** Step 4: link a device to the freshly-created Keycloak user, advance to DEVICE_REGISTERED. */
  async registerDevice(dto: RegisterAttemptDeviceDto) {
    const attempt = await this.findOne(dto.attemptId);
    this.requireStep(attempt, RegistrationStep.KEYCLOAK_USER_CREATED);

    if (!attempt.keycloakUserId) {
      throw new BadRequestException(`Attempt ${dto.attemptId} has no Keycloak user to link a device to`);
    }

    try {
      const device = await this.deviceService.create({
        userId: attempt.keycloakUserId,
        deviceId: dto.deviceId,
        deviceModel: dto.deviceModel,
      });

      const updated = await this.findOne(dto.attemptId);
      updated.deviceProfileId = device.id;
      await this.repository.save(updated);

      return this.orchestrator.advance(dto.attemptId, RegistrationStep.DEVICE_REGISTERED);
    } catch (error) {
      await this.orchestrator.fail(
        dto.attemptId,
        RegistrationStep.DEVICE_REGISTERED,
        (error as Error).message,
      );
      throw error;
    }
  }

  /** Step 5: close out the saga — the customer can now log in with the password from step 3. */
  async complete(attemptId: string) {
    const attempt = await this.findOne(attemptId);
    this.requireStep(attempt, RegistrationStep.DEVICE_REGISTERED);

    await this.orchestrator.advance(attemptId, RegistrationStep.COMPLETED);

    return {
      attemptId,
      keycloakUserId: attempt.keycloakUserId,
      status: RegistrationStep.COMPLETED,
    };
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
