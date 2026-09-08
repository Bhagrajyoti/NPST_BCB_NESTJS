import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'User ID the device belongs to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Unique device identifier (IMEI, UUID, etc.)',
    example: 'device-abc-12345',
  })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Human-readable device model name',
    example: 'Samsung Galaxy S24',
  })
  @IsOptional()
  @IsString()
  deviceModel?: string;
}
