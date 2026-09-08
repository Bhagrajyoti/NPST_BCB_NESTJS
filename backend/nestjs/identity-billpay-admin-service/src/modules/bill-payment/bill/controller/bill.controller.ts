import { Body, Controller, Post } from '@nestjs/common';

import { BillService } from '../service/bill.service';
import { FetchBillDto } from '../dto/fetch-bill.dto';

@Controller('bill-payment/bill')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post('fetch')
  fetchBill(@Body() dto: FetchBillDto) {
    return this.billService.fetchBill(dto);
  }
}
