import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DeviceService } from './device.service';

@Controller('auth/device')
export class DeviceController {
  constructor(private readonly service: DeviceService) {}

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
