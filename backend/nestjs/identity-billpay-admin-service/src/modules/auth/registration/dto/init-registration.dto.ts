import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitRegistrationDto {
  @ApiProperty({
    description: 'Mobile number of the user starting registration',
    example: '9876543210',
  })
  @IsNotEmpty()
  @IsString()
  mobileNumber: string;

  @ApiProperty({
    description: 'PAN or CIF number used to identify the corporate customer',
    example: 'CIF12345',
  })
  @IsNotEmpty()
  @IsString()
  panOrCif: string;
}
