import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import { REGEX } from '../../../../common/constants/regex.constant';

export class VerifyRegistrationOtpDto {
  @ApiProperty({ description: 'Registration attempt ID from POST /auth/registration/create' })
  @IsNotEmpty()
  @IsUUID()
  attemptId: string;

  @ApiProperty({ description: 'OTP challenge ID from POST /auth/otp/create' })
  @IsNotEmpty()
  @IsUUID()
  challengeId: string;

  @ApiProperty({ description: '6-digit OTP code', example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Matches(REGEX.OTP, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}
