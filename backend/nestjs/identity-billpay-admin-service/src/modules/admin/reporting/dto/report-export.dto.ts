import { IsIn, IsOptional, IsString } from 'class-validator';
import { ReportQueryDto } from './report-query.dto';

export class ReportExportDto extends ReportQueryDto {
  @IsString()
  @IsIn([
    'daily-summary',
    'failed',
    'high-value',
    'branch-wise',
    'channel-wise',
  ])
  reportType: string;

  @IsOptional()
  @IsString()
  @IsIn(['csv', 'excel', 'pdf'])
  format?: string;
}