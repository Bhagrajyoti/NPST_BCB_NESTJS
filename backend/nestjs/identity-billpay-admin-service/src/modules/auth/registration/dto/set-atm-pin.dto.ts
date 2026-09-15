import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { REGEX } from '../../../../common/constants/regex.constant';

export class SetAtmPinDto {
  @ApiProperty({ description: 'Registered mobile number', example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  @Matches(REGEX.MOBILE_NUMBER, { message: 'Must be a valid 10-digit Indian mobile number' })
  mobileNumber: string;

  @ApiProperty({
    description: 'Account number, as returned in registeredAccounts by POST /auth/registration/create',
    example: '10023456789012',
  })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: '4-digit ATM PIN', example: '1234' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'ATM PIN must be exactly 4 digits' })
  atmPin: string;
}
