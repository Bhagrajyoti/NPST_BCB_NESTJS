import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { AuthorizationRulesService } from './authorization-rules.service';
import { CreateAuthorizationRuleDto } from './dto/create-authorization-rule.dto';
import { UpdateAuthorizationRuleDto } from './dto/update-authorization-rule.dto';

@ApiTags('Admin — Authorization Rules')
@Controller('admin/authorization-rules')
export class AuthorizationRulesController {
  constructor(private readonly service: AuthorizationRulesService) {}

  @Post('list')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List authorization rules (BANK_SUPER_ADMIN, BANK_ADMIN)' })
  list(@AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findAll(actor);
  }

  @Post('get')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single authorization rule (BANK_SUPER_ADMIN, BANK_ADMIN)' })
  get(@Body() dto: IdRequestDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findOne(dto.id, actor);
  }

  @Post('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View version history for a rule (BANK_SUPER_ADMIN, BANK_ADMIN)' })
  history(@Body() dto: IdRequestDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findHistory(dto.id, actor);
  }

  @Post('create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an authorization rule (BANK_SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Authorization rule created, version 1' })
  create(@Body() dto: CreateAuthorizationRuleDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.create(dto, actor);
  }

  @Post('update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an authorization rule (BANK_SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Updated; version incremented; history recorded' })
  update(@Body() dto: UpdateAuthorizationRuleDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.update(dto, actor);
  }

  @Post('deactivate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete (deactivate) an authorization rule (BANK_SUPER_ADMIN only)' })
  deactivate(@Body() dto: IdRequestDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.deactivate(dto.id, actor);
  }
}
