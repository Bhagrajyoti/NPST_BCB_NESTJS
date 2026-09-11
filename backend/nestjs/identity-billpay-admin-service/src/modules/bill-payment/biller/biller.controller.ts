import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../common/decorators/auth.decorator';
import { BillerService } from './biller.service';
import { CreateBillerDto } from './dto/create-biller.dto';

@ApiTags('Bill Payment — Biller')
@Auth()
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
  create(@Body() dto: CreateBillerDto) {
    return this.service.create(dto);
  }
}
