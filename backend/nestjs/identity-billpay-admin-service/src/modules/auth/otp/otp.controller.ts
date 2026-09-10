import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { OtpService } from './otp.service';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth — OTP')
@Controller('auth/otp')
export class OtpController {
  constructor(private readonly service: OtpService) {}

  @Post('list')
  @Auth()
  @ApiOperation({ summary: 'List all OTP challenges' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @Auth()
  @ApiOperation({ summary: 'Get OTP challenge by ID' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Public()
  @Post('create')
  @ApiOperation({
    summary: 'Generate OTP',
    description:
      'Creates a 6-digit OTP for the given mobile number. ' +
      'Public — no token required. Response includes the OTP (dev only; remove in production).',
  })
  @ApiResponse({ status: 201, description: 'OTP generated' })
  create(@Body() dto: GenerateOtpDto) {
    return this.service.create(dto);
  }

  @Public()
  @Post('verify')
  @ApiOperation({
    summary: 'Verify OTP',
    description:
      'Checks the code against the challenge created by POST /auth/otp/create. Public — no ' +
      'token required (this IS how a customer proves identity before one exists). Rejects ' +
      'expired challenges, locks the challenge after too many wrong attempts, and invalidates ' +
      'it (one-time use) on success.',
  })
  @ApiResponse({ status: 201, description: 'OTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 403, description: 'Too many failed attempts — challenge locked' })
  verify(@Body() dto: VerifyOtpDto) {
    return this.service.verify(dto);
  }

  @Post('delete')
  @Auth()
  @ApiOperation({ summary: 'Soft-delete OTP challenge' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
