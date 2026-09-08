import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class UpdateAuthorizationRuleDto {
  @ApiProperty({ description: 'Authorization rule UUID to update' })
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ example: 'High-value transfer approval (revised)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  ruleName?: string;

  @ApiPropertyOptional({ example: '750000.00' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'threshold must be a positive number with up to 2 decimal places' })
  threshold?: string;

  @ApiPropertyOptional({ example: 'Raised limit per updated risk policy dated 2026-09-01' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  changeReason?: string;
}
