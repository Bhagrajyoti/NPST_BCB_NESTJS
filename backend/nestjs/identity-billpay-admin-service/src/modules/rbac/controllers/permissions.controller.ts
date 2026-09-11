import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../common/decorators/auth.decorator';
import { CreatePermissionDto } from '../dto/permission.dto';
import { SuperadminGuard } from '../guards/superadmin.guard';
import { PermissionsService } from '../services/permissions.service';

@ApiTags('RBAC — Permissions')
@Auth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post('list')
  @ApiOperation({ summary: 'List all permissions' })
  @ApiResponse({ status: 201, description: 'List of permissions' })
  list() {
    return this.permissionsService.findAll();
  }

  @Post('create')
  @UseGuards(SuperadminGuard)
  @ApiOperation({
    summary: 'Create permission',
    description:
      'Validates superadmin privileges via Keycloak and inserts a new permission record.',
  })
  @ApiResponse({ status: 201, description: 'Permission created' })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }
}
