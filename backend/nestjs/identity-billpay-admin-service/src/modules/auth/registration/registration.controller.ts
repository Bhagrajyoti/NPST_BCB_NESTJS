import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RegistrationService } from './registration.service';

@Controller('auth/registration')
export class RegistrationController {
  constructor(private readonly service: RegistrationService) {}

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
