import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { REGEX } from '../../../../common/constants/regex.constant';

export class GenerateOtpDto {
  @ApiProperty({
    description: 'Mobile number to send the OTP to',
    example: '9876543210',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(REGEX.MOBILE_NUMBER, { message: 'Must be a valid 10-digit Indian mobile number' })
  mobileNumber: string;
}
