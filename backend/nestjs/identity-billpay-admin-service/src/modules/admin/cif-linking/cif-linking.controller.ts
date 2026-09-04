import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CifLinkingService } from './cif-linking.service';

@Controller('admin/cif-linking')
export class CifLinkingController {
  constructor(private readonly service: CifLinkingService) {}

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
