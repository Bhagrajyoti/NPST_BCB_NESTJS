import { Injectable } from '@nestjs/common';
import { ReportQueryDto } from './dto/report-query.dto';

// Reads read-models only — never reaches into other modules' tables directly.
@Injectable()
export class ReportingService {
  async query(_filters: ReportQueryDto): Promise<unknown[]> {
    return [];
  }
}
