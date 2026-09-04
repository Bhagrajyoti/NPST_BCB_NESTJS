import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CredentialService } from './credential.service';

@Controller('auth/credential')
export class CredentialController {
  constructor(private readonly service: CredentialService) {}

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
