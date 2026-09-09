import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ADMIN_PORTAL_ROLES = ['BANK_SUPER_ADMIN', 'BANK_ADMIN', 'BANK_MAKER', 'BANK_CHECKER'] as const;

export class ListAdminUsersDto {
  @ApiPropertyOptional({ enum: ADMIN_PORTAL_ROLES })
  @IsOptional()
  @IsIn(ADMIN_PORTAL_ROLES)
  role?: (typeof ADMIN_PORTAL_ROLES)[number];

  @ApiPropertyOptional({ description: 'Search by username or email' })
  @IsOptional()
  @IsString()
  search?: string;
}
