import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateOtpDto {
  @ApiProperty({
    description: 'Mobile number to send the OTP to',
    example: '9876543210',
  })
  @IsNotEmpty()
  @IsString()
  mobileNumber: string;
}
