import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Auth } from '../../../common/decorators/auth.decorator';
import {
  BANK_CATALOG_ADMIN_ROLES,
  BBPS_CATALOG_READ_ROLES,
} from '../../rbac/constants/rbac.constants';
import { BillerService } from './biller.service';
import { CreateBillerDto } from './dto/create-biller.dto';
import { ListBillersQueryDto } from './dto/list-billers-query.dto';

@ApiTags('Bill Payment — Biller')
@Controller('bill-payment/biller')
export class BillerController {
  constructor(private readonly service: BillerService) {}

  @Get('categories')
  @Auth(...BBPS_CATALOG_READ_ROLES)
  @ApiOperation({
    summary: 'List distinct biller categories (active billers only)',
    description:
      'Requires realm roles: BANK_SUPER_ADMIN, BANK_ADMIN, RETAIL_CUSTOMER, or corporate customer roles.',
  })
  getCategories() {
    return this.service.getCategories();
  }

  @Get()
  @Auth(...BBPS_CATALOG_READ_ROLES)
  @ApiOperation({
    summary: 'List billers',
    description:
      'Optional `category` query returns only active billers in that category. Shared catalog read for admin web and mobile.',
  })
  findAll(@Query() query: ListBillersQueryDto) {
    return this.service.findAll(query.category);
  }

  @Get(':id')
  @Auth(...BBPS_CATALOG_READ_ROLES)
  @ApiOperation({ summary: 'Get biller by id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auth(...BANK_CATALOG_ADMIN_ROLES)
  @ApiOperation({
    summary: 'Register a master biller (bank catalog)',
    description: 'Bank operations only — BANK_SUPER_ADMIN or BANK_ADMIN.',
  })
  create(@Body() dto: CreateBillerDto) {
    return this.service.create(dto);
  }
}
