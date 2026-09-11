import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../common/decorators/auth.decorator';
import { ReportingService } from './reporting.service';
import { ReportQueryDto } from './dto/report-query.dto';

@ApiTags('Admin — Reporting')
@Auth()
@Controller('admin/reporting')
export class ReportingController {
  constructor(private readonly service: ReportingService) {}

  @Get()
  find(@Query() query: ReportQueryDto) {
    return this.service.query(query);
  }
}
