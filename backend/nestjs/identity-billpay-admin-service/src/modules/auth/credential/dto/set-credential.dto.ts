import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SetCredentialDto {
  @ApiProperty({
    description:
      'Keycloak user ID of the **customer** (`sub` from POST /auth/me on mobile app)',
    example: '334b032c-7468-47fa-82a3-8204b80913a2',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description:
      'Customer login password for the mobile app. Stored in Keycloak only (never in local DB).',
    example: 'MySecurePass@123',
  })
  @ValidateIf((dto: SetCredentialDto) => !dto.mpin)
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({
    description:
      'Customer banking MPIN (4–6 digits) used in the **mobile app**. Hashed and stored locally.',
    example: '1234',
  })
  @ValidateIf((dto: SetCredentialDto) => !dto.password)
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  mpin?: string;
}
