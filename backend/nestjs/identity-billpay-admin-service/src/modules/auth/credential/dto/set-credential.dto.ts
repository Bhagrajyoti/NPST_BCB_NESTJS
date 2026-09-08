import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetCredentialDto {
  @ApiProperty({
    description: 'Keycloak user ID or internal user reference',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Plain-text password (will be hashed before storage)',
    example: 'MySecurePass@123',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
