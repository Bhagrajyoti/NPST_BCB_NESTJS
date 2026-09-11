import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { AdminUserService } from './admin-user.service';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';

// Read-only view over admin-portal accounts. Creation and role assignment
// stay owned by rbac/employees; this module only mirrors that data via the
// internal event bus (see admin-user-sync.listener.ts).
@ApiTags('Admin — Admin Users')
@Controller('admin/admin-user')
export class AdminUserController {
  constructor(private readonly service: AdminUserService) {}

  // PUBLIC — no login required (made public on request, for development).
  // This exposes staff names, emails and ids to anyone who can reach the API.
  // Before production: remove @Public(), put @Auth() back on this method, and
  // restore the role check in AdminUserService.findAll().
  @Public()
  @Post('list')
  @ApiOperation({
    summary: 'List admin portal accounts (PUBLIC — no login needed)',
    description:
      'Returns every bank staff account that can use the admin website (BANK_SUPER_ADMIN, ' +
      'BANK_ADMIN, BANK_MAKER, BANK_CHECKER), newest first. No token needed. Send {} to see ' +
      'everyone, or filter by role and/or search.',
  })
  // Without these examples Swagger pre-fills {"role":"BANK_SUPER_ADMIN","search":"string"},
  // which silently filters every row out. The first example — no filters — is the default.
  @ApiBody({
    type: ListAdminUsersDto,
    examples: {
      everyone: { summary: 'Everyone (no filters)', value: {} },
      oneRole: { summary: 'Only one role', value: { role: 'BANK_MAKER' } },
      search: { summary: 'Search username or email', value: { search: 'ravi' } },
    },
  })
  list(@Body() dto: ListAdminUsersDto) {
    return this.service.findAll(dto);
  }

  @Post('get')
  @Auth()
  @ApiOperation({ summary: 'Get a single admin portal account (BANK_SUPER_ADMIN, BANK_ADMIN)' })
  get(@Body() dto: IdRequestDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findOne(dto.id, actor);
  }
}
