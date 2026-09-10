import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { REGEX } from '../../../../common/constants/regex.constant';

export class InitRegistrationDto {
  @ApiProperty({
    description: 'Customer mobile number starting registration in the mobile app',
    example: '9876543210',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(REGEX.MOBILE_NUMBER, { message: 'Must be a valid 10-digit Indian mobile number' })
  mobileNumber: string;

  // Deliberately NOT validated against REGEX.PAN: this field accepts either a PAN
  // (AAAAA9999A) or a CIF (e.g. "CIF12345", as in the example below) — a strict PAN
  // regex here would reject every legitimate CIF value.
  @ApiProperty({
    description: 'Customer PAN or CIF used to identify the corporate/retail customer during mobile onboarding',
    example: 'CIF12345',
  })
  @IsNotEmpty()
  @IsString()
  panOrCif: string;
}
