import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCredentialsDto {
  @ApiProperty({ description: 'Registration attempt ID from POST /auth/registration/create' })
  @IsNotEmpty()
  @IsUUID()
  attemptId: string;

  @ApiProperty({ description: 'Login password to set on the new Keycloak user', example: 'MySecurePass@123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
