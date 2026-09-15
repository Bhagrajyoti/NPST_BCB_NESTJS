import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../../../../common/decorators/auth.decorator';
import { BillService } from '../service/bill.service';
import { FetchBillDto } from '../dto/fetch-bill.dto';

@ApiTags('Bill Payment — Bill')
@Auth()
@Controller('bill-payment/bill')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post('fetch')
  fetchBill(@Body() dto: FetchBillDto) {
    return this.billService.fetchBill(dto);
  }
}
