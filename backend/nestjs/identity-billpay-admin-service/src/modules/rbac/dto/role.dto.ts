import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'BANK_MAKER' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Bank Maker' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  displayName: string;

  @ApiPropertyOptional({ example: 'Creates banking transactions for approval' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Keycloak user IDs of BANK_ADMIN users allowed to assign this role',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  delegatedAdminKeycloakUserIds?: string[];
}

export class UpdateRoleDto {
  @ApiProperty({ description: 'Local role UUID to update' })
  @IsNotEmpty()
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ example: 'Bank Maker (Updated)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Updated role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Replace delegated BANK_ADMIN user list for this role',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  delegatedAdminKeycloakUserIds?: string[];
}

export class MapRolePermissionsDto {
  @ApiProperty({ description: 'Target local role UUID' })
  @IsNotEmpty()
  @IsUUID()
  roleId: string;

  @ApiProperty({
    description: 'Permission UUIDs to assign to the role (replaces existing mappings)',
    type: [String],
    example: ['c12069f4-ad09-41e8-81e2-863c45728307'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
