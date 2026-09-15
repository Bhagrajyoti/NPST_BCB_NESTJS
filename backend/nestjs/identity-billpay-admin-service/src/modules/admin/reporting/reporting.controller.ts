import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { Auth } from '../../../common/decorators/auth.decorator';
import { ReportingService } from './reporting.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportExportDto } from './dto/report-export.dto';
import { ReportExportService } from './exporters/report-export.service';

@ApiTags('Admin — Reporting')
@Auth()
@Controller('admin/reporting')
export class ReportingController {
  constructor(
    private readonly service: ReportingService,
    private readonly exportService: ReportExportService,
  ) {}

  @Get('transactions/daily-summary')
  dailySummary(@Query() query: ReportQueryDto) {
    return this.service.dailySummary(query);
  }

  @Get('transactions/failed')
  failedTransactions(@Query() query: ReportQueryDto) {
    return this.service.failedTransactions(query);
  }

  @Get('transactions/high-value')
  highValueTransactions(@Query() query: ReportQueryDto) {
    return this.service.highValueTransactions(query);
  }

  @Get('transactions/branch-wise')
  branchWise(@Query() query: ReportQueryDto) {
    return this.service.branchWise(query);
  }

  @Get('transactions/channel-wise')
  channelWise(@Query() query: ReportQueryDto) {
    return this.service.channelWise(query);
  }

  @Get('transactions/export')
  async exportReport(
    @Query() query: ReportExportDto,
    @Res() response: Response,
  ) {
    const data = await this.getReportData(query);

    switch (query.format ?? 'csv') {
      case 'csv':
        return this.exportService.exportCsv(
          query.reportType,
          data,
          response,
        );

      case 'excel':
        return this.exportService.exportExcel(
          query.reportType,
          data,
          response,
        );

      case 'pdf':
        return this.exportService.exportPdf(
          query.reportType,
          data,
          response,
        );

      default:
        return response.status(400).json({
          message: 'Unsupported export format',
        });
    }
  }

  private async getReportData(query: ReportExportDto): Promise<any[]> {
    switch (query.reportType) {
      case 'daily-summary': {
        const result = await this.service.dailySummary(query);
        return [result];
      }

      case 'failed': {
        const result = await this.service.failedTransactions(query);
        return (result as any).data ?? [];
      }

      case 'high-value': {
        const result = await this.service.highValueTransactions(query);
        return (result as any).data ?? [];
      }

      case 'branch-wise': {
        const result = await this.service.branchWise(query);
        return (result as any).data ?? [];
      }

      case 'channel-wise': {
        const result = await this.service.channelWise(query);
        return (result as any).data ?? [];
      }

      default:
        return [];
    }
  }
}