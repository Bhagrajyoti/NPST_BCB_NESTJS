import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const CORPORATE_ROLES = [
  'CORPORATE_IT_ADMIN',
  'CORPORATE_MAKER',
  'CORPORATE_CHECKER',
  'CORPORATE_VIEWER',
] as const;

const BANK_ROLES = ['BANK_SUPER_ADMIN', 'BANK_ADMIN', 'BANK_MAKER', 'BANK_CHECKER'] as const;

const ALL_ROLES = [...BANK_ROLES, ...CORPORATE_ROLES, 'RETAIL_CUSTOMER'] as const;

export class SetHierarchyRoleDto {
  @ApiProperty({
    description: 'Keycloak user ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Corporate CIF number',
    example: 'CIF12345',
  })
  @IsNotEmpty()
  @IsString()
  cif: string;

  @ApiProperty({
    description: 'Realm role assigned to the user in corporate hierarchy',
    enum: ALL_ROLES,
    example: 'CORPORATE_MAKER',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(ALL_ROLES)
  role: string;
}
