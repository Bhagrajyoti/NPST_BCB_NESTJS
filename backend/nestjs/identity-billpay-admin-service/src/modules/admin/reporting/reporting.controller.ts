import { Controller, Get, Query } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('admin/reporting')
export class ReportingController {
  constructor(private readonly service: ReportingService) {}

  @Get()
  find(@Query() query: ReportQueryDto) {
    return this.service.query(query);
  }
}
