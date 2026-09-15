import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'EMPLOYEE_CREATE' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  code: string;

  @ApiProperty({ example: 'Create Employee' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Allows provisioning employees in Keycloak and local DB' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'EMPLOYEE' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  module: string;

  @ApiProperty({ example: 'CREATE' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  action: string;

  @ApiPropertyOptional({
    description: 'Flags this permission as needing a secondary confirmation step in the UI',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  highRisk?: boolean;
}
