import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CorporateHierarchyService } from './corporate-hierarchy.service';

@Controller('auth/corporate-hierarchy')
export class CorporateHierarchyController {
  constructor(private readonly service: CorporateHierarchyService) {}

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
