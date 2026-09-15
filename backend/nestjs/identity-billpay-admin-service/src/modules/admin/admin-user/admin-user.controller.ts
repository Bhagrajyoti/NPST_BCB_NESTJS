import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { AdminUserService } from './admin-user.service';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';

// Read-only view over admin-portal accounts. Creation and role assignment
// stay owned by rbac/employees; this module only mirrors that data via the
// internal event bus (see admin-user-sync.listener.ts).
@ApiTags('Admin — Admin Users')
@Auth()
@Controller('admin/admin-user')
export class AdminUserController {
  constructor(private readonly service: AdminUserService) {}

  @Post('list')
  @ApiOperation({ summary: 'List admin portal accounts (BANK_SUPER_ADMIN, BANK_ADMIN)' })
  list(@Body() dto: ListAdminUsersDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findAll(dto, actor);
  }

  @Post('get')
  @ApiOperation({ summary: 'Get a single admin portal account (BANK_SUPER_ADMIN, BANK_ADMIN)' })
  get(@Body() dto: IdRequestDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findOne(dto.id, actor);
  }
}
