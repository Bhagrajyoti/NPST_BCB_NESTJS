import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class VerifyCredentialDto {
  @ApiPropertyOptional({
    description: 'Customer Keycloak user ID (`sub` from POST /auth/me). Omit to use the logged-in mobile app user.',
    example: '334b032c-7468-47fa-82a3-8204b80913a2',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'MPIN to check against the stored hash', example: '1234' })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  mpin: string;
}
