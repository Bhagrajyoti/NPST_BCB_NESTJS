import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BillerService } from './biller.service';

@Controller('bill-payment/biller')
export class BillerController {
  constructor(private readonly service: BillerService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.service.create(dto);
  }
}
