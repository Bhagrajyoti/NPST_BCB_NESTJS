import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListBillersQueryDto {
  @ApiPropertyOptional({
    example: 'ELECTRICITY',
    description: 'Filter active billers by category (e.g. ELECTRICITY, WATER, GAS)',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
