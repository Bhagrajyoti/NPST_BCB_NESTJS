import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FetchAccessDetailsDto } from '../dto/fetch-access-details.dto';
import { UsersAccessService } from '../services/users-access.service';

@ApiTags('RBAC — Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersAccessService: UsersAccessService) {}

  @Post('fetch-access-details')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch user access details',
    description:
      'Queries Keycloak and the local RBAC tables to return resolved user profiles with roles and permissions.',
  })
  @ApiResponse({ status: 200, description: 'Resolved access details' })
  fetchAccessDetails(@Body() dto: FetchAccessDetailsDto) {
    return this.usersAccessService.fetchAccessDetails(dto);
  }
}
