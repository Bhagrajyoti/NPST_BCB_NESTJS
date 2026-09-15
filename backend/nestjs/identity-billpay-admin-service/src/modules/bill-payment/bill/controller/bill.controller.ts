import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../../common/decorators/auth.decorator';
import { BBPS_BILL_FETCH_ROLES } from '../../../rbac/constants/rbac.constants';
import { BillService } from '../service/bill.service';
import { FetchBillDto } from '../dto/fetch-bill.dto';

@ApiTags('Bill Payment — Bill')
@Controller('bill-payment/bill')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post('fetch')
  @Auth(...BBPS_BILL_FETCH_ROLES)
  @ApiOperation({
    summary: 'Fetch bill details',
    description:
      'Customer mobile flow — RETAIL_CUSTOMER or corporate customer realm roles (not bank maker/checker).',
  })
  fetchBill(@Body() dto: FetchBillDto) {
    return this.billService.fetchBill(dto);
  }
}
