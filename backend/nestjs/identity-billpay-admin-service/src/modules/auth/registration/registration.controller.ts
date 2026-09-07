import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { RegistrationService } from './registration.service';
import { InitRegistrationDto } from './dto/init-registration.dto';

@ApiTags('Auth — Registration')
@Controller('auth/registration')
export class RegistrationController {
  constructor(private readonly service: RegistrationService) {}

  @Post('list')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all registration attempts',
    description: 'Returns all active (non-deleted) registration records. Requires Bearer token.',
  })
  @ApiResponse({ status: 200, description: 'List of registration attempts' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get registration by ID',
    description: 'Fetches a single registration attempt by UUID.',
  })
  @ApiResponse({ status: 200, description: 'Registration record' })
  @ApiResponse({ status: 404, description: 'Not found' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Public()
  @Post('create')
  @ApiOperation({
    summary: 'Start registration',
    description:
      'Creates a new registration attempt with step INIT. ' +
      'Public — no token required. Called when a user begins onboarding.',
  })
  @ApiResponse({ status: 201, description: 'Registration started' })
  create(@Body() dto: InitRegistrationDto) {
    return this.service.create(dto);
  }

  @Post('delete')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft-delete registration',
    description: 'Marks the registration as deleted (sets deleted_at). Record is not removed from DB.',
  })
  @ApiResponse({ status: 200, description: 'Soft-deleted successfully' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
