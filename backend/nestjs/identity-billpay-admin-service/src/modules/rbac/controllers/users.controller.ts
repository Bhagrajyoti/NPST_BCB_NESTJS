import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../common/decorators/auth.decorator';
import { FetchAccessDetailsDto } from '../dto/fetch-access-details.dto';
import { UsersAccessService } from '../services/users-access.service';

@ApiTags('RBAC — Users')
@Auth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersAccessService: UsersAccessService) {}

  @Post('fetch-access-details')
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
