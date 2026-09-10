import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Auth } from '../../../common/decorators/auth.decorator';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Bill Payment — Payment')
@Auth()
@Controller('bill-payment/payment')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.service.create(dto);
  }

  @Post('retry')
  @ApiOperation({
    summary: 'Retry a non-final payment via BBPS',
    description: 'Re-dispatches a PENDING/TIMEOUT/FAILED payment to BBPS and updates its status.',
  })
  async retry(@Body() dto: IdRequestDto) {
    await this.service.payViaBbps(dto.id);
    return this.service.findOne(dto.id);
  }
}
