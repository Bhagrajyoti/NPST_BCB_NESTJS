import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { adminPortalOp, mobileCustomerOp } from '../../../common/swagger/api-audience.constants';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { RegistrationService } from './registration.service';
import { InitRegistrationDto } from './dto/init-registration.dto';

@ApiTags('Mobile — Registration (Customer onboarding)', 'Auth — Registration')
@Controller('auth/registration')
export class RegistrationController {
  constructor(private readonly service: RegistrationService) {}

  @Post('list')
  @ApiBearerAuth()
  @ApiOperation(
    adminPortalOp(
      'List registration attempts',
      'Returns all active customer registration records for bank staff review in the admin portal.',
    ),
  )
  @ApiResponse({ status: 200, description: 'List of registration attempts' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @ApiBearerAuth()
  @ApiOperation(
    adminPortalOp(
      'Get registration attempt by ID',
      'Fetches a single customer registration record by internal UUID for admin review.',
    ),
  )
  @ApiResponse({ status: 200, description: 'Registration record' })
  @ApiResponse({ status: 404, description: 'Not found' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Public()
  @Post('create')
  @ApiOperation(
    mobileCustomerOp(
      'Start customer registration',
      'First step of mobile-app customer onboarding. ' +
        'Creates a registration attempt with step INIT using the customer’s mobile number and PAN/CIF. ' +
        'Public — no Bearer token required.',
    ),
  )
  @ApiResponse({ status: 201, description: 'Registration started' })
  create(@Body() dto: InitRegistrationDto) {
    return this.service.create(dto);
  }

  @Post('delete')
  @ApiBearerAuth()
  @ApiOperation(
    adminPortalOp(
      'Soft-delete registration attempt',
      'Marks a customer registration as deleted for admin cleanup. Record is retained in the database.',
    ),
  )
  @ApiResponse({ status: 200, description: 'Soft-deleted successfully' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
