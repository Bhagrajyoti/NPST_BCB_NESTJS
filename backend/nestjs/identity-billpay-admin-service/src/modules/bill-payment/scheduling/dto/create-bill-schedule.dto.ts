import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateBillScheduleDto {
  @ApiProperty({ example: 'ELECTRICITY' })
  @IsString()
  billerCode: string;

  @ApiProperty({ example: '123456780' })
  @IsString()
  consumerNumber: string;

  @ApiProperty({ enum: ['ONE_TIME', 'RECURRING'], example: 'RECURRING' })
  @IsIn(['ONE_TIME', 'RECURRING'])
  scheduleType: string;

  @ApiPropertyOptional({ enum: ['MONTHLY'], example: 'MONTHLY' })
  @IsOptional()
  @IsIn(['MONTHLY'])
  frequency?: string;

  @ApiProperty({ example: '2026-10-05T09:00:00.000Z' })
  @IsDateString()
  nextRunAt: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(1)
  maximumAmount: number;
}