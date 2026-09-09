import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitRegistrationDto {
  @ApiProperty({
    description: 'Customer mobile number starting registration in the mobile app',
    example: '9876543210',
  })
  @IsNotEmpty()
  @IsString()
  mobileNumber: string;

  @ApiProperty({
    description: 'Customer PAN or CIF used to identify the corporate/retail customer during mobile onboarding',
    example: 'CIF12345',
  })
  @IsNotEmpty()
  @IsString()
  panOrCif: string;
}
