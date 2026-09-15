import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { CreateRoleDto, MapRolePermissionsDto, UpdateRoleDto } from '../dto/role.dto';
import { SuperadminGuard } from '../guards/superadmin.guard';
import { RolesService } from '../services/roles.service';

@ApiTags('RBAC — Roles')
@Auth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('create')
  @UseGuards(SuperadminGuard)
  @ApiOperation({
    summary: 'Create role',
    description:
      'Validates the caller Keycloak token for superadmin status, creates the role in Keycloak, and persists it locally.',
  })
  @ApiResponse({ status: 201, description: 'Role created and synchronized with Keycloak' })
  create(@Body() dto: CreateRoleDto, @AuthenticatedUser() user: Record<string, unknown>) {
    return this.rolesService.create(dto, user.sub as string);
  }

  @Post('update')
  @UseGuards(SuperadminGuard)
  @ApiOperation({
    summary: 'Update role definition',
    description:
      'Updates role metadata (display name, description, delegations) in the local database and Keycloak. ' +
      'This does not change an employee assignment — use POST /employees/update-role for that.',
  })
  update(@Body() dto: UpdateRoleDto, @AuthenticatedUser() user: Record<string, unknown>) {
    return this.rolesService.update(dto, user.sub as string);
  }

  @Post('map-permissions')
  @UseGuards(SuperadminGuard)
  @ApiOperation({
    summary: 'Map permissions to role',
    description:
      'Replaces permission mappings for the target role ID with the provided permission IDs.',
  })
  mapPermissions(
    @Body() dto: MapRolePermissionsDto,
    @AuthenticatedUser() user: Record<string, unknown>,
  ) {
    return this.rolesService.mapPermissions(dto, user.sub as string);
  }
}
