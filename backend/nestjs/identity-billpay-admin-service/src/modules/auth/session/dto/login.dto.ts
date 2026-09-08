import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Keycloak username / login ID (not email)',
    example: 'corp-maker-01',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: 'User password',
    example: 'corp-maker-01',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'Keycloak client to authenticate against',
    enum: ['admin-web', 'mobile-app'],
    default: 'admin-web',
    example: 'admin-web',
  })
  @IsOptional()
  @IsString()
  @IsIn(['admin-web', 'mobile-app'])
  clientId?: 'admin-web' | 'mobile-app';
}
