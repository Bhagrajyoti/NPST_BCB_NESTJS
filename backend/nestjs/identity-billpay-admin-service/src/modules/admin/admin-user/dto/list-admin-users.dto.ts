import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ADMIN_PORTAL_ROLES = ['BANK_SUPER_ADMIN', 'BANK_ADMIN', 'BANK_MAKER', 'BANK_CHECKER'] as const;

export class ListAdminUsersDto {
  @ApiPropertyOptional({
    enum: ADMIN_PORTAL_ROLES,
    description:
      'Filter: show only accounts that HAVE this role. This is not your own role. ' +
      'Leave empty to see everyone.',
  })
  @IsOptional()
  @IsIn(ADMIN_PORTAL_ROLES)
  role?: (typeof ADMIN_PORTAL_ROLES)[number];

  @ApiPropertyOptional({
    description: 'Filter: part of a username or email. Leave empty to see everyone.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
