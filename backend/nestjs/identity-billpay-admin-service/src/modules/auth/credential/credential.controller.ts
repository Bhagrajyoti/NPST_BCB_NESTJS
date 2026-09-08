import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { adminPortalOp, mobileCustomerOp } from '../../../common/swagger/api-audience.constants';
import { CredentialService } from './credential.service';
import { GetCredentialDto } from './dto/get-credential.dto';
import { SetCredentialDto } from './dto/set-credential.dto';

@ApiTags('Mobile — Credential (Customer MPIN)')
@ApiBearerAuth()
@Controller('auth/credential')
export class CredentialController {
  constructor(private readonly service: CredentialService) {}

  @Post('list')
  @ApiOperation(
    adminPortalOp(
      'List all customer MPIN credentials',
      'Returns all active local MPIN records for support and audit. Customers do not use this from the mobile app.',
    ),
  )
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @ApiOperation(
    mobileCustomerOp(
      'Get customer MPIN credential',
      'Returns the logged-in customer’s MPIN metadata from the mobile app. ' +
        'Uses the Keycloak user ID (`sub` from POST /auth/session/me). ' +
        'If `userId` is omitted, the authenticated Bearer token user is used.',
    ),
  )
  @ApiResponse({ status: 404, description: 'No MPIN credential exists for this customer' })
  get(
    @Body() dto: GetCredentialDto,
    @AuthenticatedUser() user: Record<string, unknown>,
  ) {
    return this.service.resolveGet(dto, user?.sub as string | undefined);
  }

  @Post('create')
  @ApiOperation(
    mobileCustomerOp(
      'Set customer MPIN (and optional password)',
      'Primary mobile-app onboarding endpoint. ' +
        '**MPIN** is hashed and stored locally for banking transactions in the mobile app. ' +
        '**Password** (optional) is written to Keycloak only. ' +
        'Use the customer’s Keycloak user ID (`sub` from session/me) as `userId`.',
    ),
  )
  create(@Body() dto: SetCredentialDto) {
    return this.service.create(dto);
  }

  @Post('delete')
  @ApiOperation(
    mobileCustomerOp(
      'Reset customer MPIN',
      'Soft-deletes the customer’s local MPIN record (e.g. mobile app “forgot MPIN” flow). ' +
        'Does not change the Keycloak login password.',
    ),
  )
  delete(@Body() dto: GetCredentialDto, @AuthenticatedUser() user: Record<string, unknown>) {
    const keycloakUserId = dto.userId ?? (user?.sub as string);
    return this.service.softDeleteByKeycloakUserId(keycloakUserId);
  }
}
