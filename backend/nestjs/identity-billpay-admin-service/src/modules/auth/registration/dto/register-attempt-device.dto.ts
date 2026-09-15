import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterAttemptDeviceDto {
  @ApiProperty({ description: 'Registration attempt ID from POST /auth/registration/create' })
  @IsNotEmpty()
  @IsUUID()
  attemptId: string;

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
