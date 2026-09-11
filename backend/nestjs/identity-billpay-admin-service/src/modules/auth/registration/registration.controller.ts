import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { adminPortalOp, mobileCustomerOp } from '../../../common/swagger/api-audience.constants';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { RegistrationService } from './registration.service';
import { RegistrationOrchestratorService } from './registration-orchestrator.service';
import { InitRegistrationDto } from './dto/init-registration.dto';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto';
import { CreateCredentialsDto } from './dto/create-credentials.dto';
import { RegisterAttemptDeviceDto } from './dto/register-attempt-device.dto';

@ApiTags('Mobile — Registration (Customer onboarding)', 'Auth — Registration')
@Controller('auth/registration')
export class RegistrationController {
  constructor(
    private readonly service: RegistrationService,
    private readonly orchestrator: RegistrationOrchestratorService,
  ) {}

  @Post('list')
  @Auth()
  @ApiOperation(
    adminPortalOp(
      'List registration attempts',
      'Returns all active customer registration records for bank staff review in the admin portal.',
    ),
  )
  @ApiResponse({ status: 200, description: 'List of registration attempts' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @Auth()
  @ApiOperation(
    adminPortalOp(
      'Get registration attempt by ID',
      'Fetches a single customer registration record by internal UUID for admin review.',
    ),
  )
  @ApiResponse({ status: 200, description: 'Registration record' })
  @ApiResponse({ status: 404, description: 'Not found' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Public()
  @Post('resume')
  @ApiOperation(
    mobileCustomerOp(
      'Resume registration',
      'Returns the attempt\'s current step and what to call next — safe to poll after an app ' +
        'crash/restart mid-onboarding, since every step here is idempotent.',
    ),
  )
  @ApiResponse({ status: 200, description: '{ attemptId, currentStep, nextAction }' })
  resume(@Body() dto: IdRequestDto) {
    return this.orchestrator.resume(dto.id);
  }

  @Public()
  @Post('create')
  @ApiOperation(
    mobileCustomerOp(
      'Start customer registration',
      'Step 1 of 5. Creates a registration attempt with step INIT using the customer’s ' +
        'mobile number and PAN/CIF. Public — no Bearer token required.',
    ),
  )
  @ApiResponse({ status: 201, description: 'Registration started' })
  create(@Body() dto: InitRegistrationDto) {
    return this.service.create(dto);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation(
    mobileCustomerOp(
      'Verify registration OTP',
      'Step 2 of 5. Verify the code from POST /auth/otp/create against this attempt\'s ' +
        'mobile number, then advances the attempt to OTP_VERIFIED.',
    ),
  )
  @ApiResponse({ status: 201, description: 'Attempt advanced to OTP_VERIFIED' })
  @ApiResponse({ status: 400, description: 'Invalid/expired OTP, or attempt not at INIT' })
  verifyOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.service.verifyOtp(dto);
  }

  @Public()
  @Post('create-credentials')
  @ApiOperation(
    mobileCustomerOp(
      'Set login password & provision Keycloak user',
      'Step 3 of 5. Sets the customer\'s login password and creates their real Keycloak ' +
        'account (role RETAIL_CUSTOMER) — this is what POST /auth/login will authenticate ' +
        'against afterwards. Advances the attempt to KEYCLOAK_USER_CREATED, or rolls back to ' +
        'CREDENTIALS_SET on failure.',
    ),
  )
  @ApiResponse({ status: 201, description: 'Attempt advanced to KEYCLOAK_USER_CREATED' })
  @ApiResponse({ status: 400, description: 'Attempt not at OTP_VERIFIED' })
  createCredentials(@Body() dto: CreateCredentialsDto) {
    return this.service.createCredentials(dto);
  }

  @Public()
  @Post('register-device')
  @ApiOperation(
    mobileCustomerOp(
      'Register onboarding device',
      'Step 4 of 5. Links the mobile device to the newly-created Keycloak user for ' +
        'trusted-device checks, advances the attempt to DEVICE_REGISTERED.',
    ),
  )
  @ApiResponse({ status: 201, description: 'Attempt advanced to DEVICE_REGISTERED' })
  @ApiResponse({ status: 400, description: 'Attempt not at KEYCLOAK_USER_CREATED' })
  registerDevice(@Body() dto: RegisterAttemptDeviceDto) {
    return this.service.registerDevice(dto);
  }

  @Public()
  @Post('complete')
  @ApiOperation(
    mobileCustomerOp(
      'Complete registration',
      'Step 5 of 5. Marks the attempt COMPLETED. The customer can now call POST /auth/login ' +
        'with the mobile number as username and the password from create-credentials.',
    ),
  )
  @ApiResponse({ status: 201, description: '{ attemptId, keycloakUserId, status: "COMPLETED" }' })
  @ApiResponse({ status: 400, description: 'Attempt not at DEVICE_REGISTERED' })
  complete(@Body() dto: IdRequestDto) {
    return this.service.complete(dto.id);
  }

  @Post('delete')
  @Auth()
  @ApiOperation(
    adminPortalOp(
      'Soft-delete registration attempt',
      'Marks a customer registration as deleted for admin cleanup. Record is retained in the database.',
    ),
  )
  @ApiResponse({ status: 200, description: 'Soft-deleted successfully' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
