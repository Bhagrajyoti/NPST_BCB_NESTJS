import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    description: 'Refresh token returned from the login response',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJhYmMxMjMifQ...',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  @ApiPropertyOptional({
    description: 'Keycloak client used during login',
    enum: ['admin-web', 'mobile-app'],
    default: 'admin-web',
    example: 'admin-web',
  })
  @IsOptional()
  @IsString()
  @IsIn(['admin-web', 'mobile-app'])
  clientId?: 'admin-web' | 'mobile-app';
}
