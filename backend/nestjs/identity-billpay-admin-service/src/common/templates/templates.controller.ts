import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../decorators/auth.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';

// Notification template management — writes here should be BANK_ADMIN/BANK_SUPER_ADMIN
// only (was previously wide open with no @Auth() at all: any unauthenticated caller
// could create templates).
@ApiTags('Notification Templates')
@Auth('BANK_SUPER_ADMIN', 'BANK_ADMIN')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto);
  }
}
