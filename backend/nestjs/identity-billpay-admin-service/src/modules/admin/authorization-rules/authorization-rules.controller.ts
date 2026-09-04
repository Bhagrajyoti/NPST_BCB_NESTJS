import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthorizationRulesService } from './authorization-rules.service';

@Controller('admin/authorization-rules')
export class AuthorizationRulesController {
  constructor(private readonly service: AuthorizationRulesService) {}

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
