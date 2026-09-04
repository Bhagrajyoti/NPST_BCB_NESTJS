import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';

@Controller('admin/admin-user')
export class AdminUserController {
  constructor(private readonly service: AdminUserService) {}

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
