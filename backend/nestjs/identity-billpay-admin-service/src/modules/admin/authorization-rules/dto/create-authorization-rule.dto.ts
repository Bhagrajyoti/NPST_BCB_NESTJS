import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateAuthorizationRuleDto {
  @ApiProperty({ example: 'High-value transfer approval' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  ruleName: string;

  @ApiProperty({ example: 'CIF12345' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  cif: string;

  @ApiProperty({ example: '500000.00', description: 'Amount above which a second approval is required' })
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'threshold must be a positive number with up to 2 decimal places' })
  threshold: string;
}
