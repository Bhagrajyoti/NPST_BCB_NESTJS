import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { REGEX } from '../../../common/constants/regex.constant';

export class FetchAccessDetailsDto {
  @ApiPropertyOptional({ description: 'Filter by Keycloak user UUID' })
  @IsOptional()
  @IsString()
  keycloakUserId?: string;

  @ApiPropertyOptional({ description: 'Filter by local employee UUID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by username (exact match)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Filter by email (exact match)' })
  @IsOptional()
  @IsString()
  @Matches(REGEX.EMAIL, { message: 'Must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Filter by local role UUID' })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
