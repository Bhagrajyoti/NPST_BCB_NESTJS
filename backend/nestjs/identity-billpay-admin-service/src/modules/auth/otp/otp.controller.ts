import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OtpService } from './otp.service';

@Controller('auth/otp')
export class OtpController {
  constructor(private readonly service: OtpService) {}

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
