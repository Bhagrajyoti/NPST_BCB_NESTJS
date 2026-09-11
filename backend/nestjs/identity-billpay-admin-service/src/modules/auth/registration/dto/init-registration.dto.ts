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
}
