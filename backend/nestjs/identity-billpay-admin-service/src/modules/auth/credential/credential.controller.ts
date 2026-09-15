import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { adminPortalOp, mobileCustomerOp } from '../../../common/swagger/api-audience.constants';
import { IdorGuard } from '../../../common/guards/idor.guard';
import { CredentialService } from './credential.service';
import { GetCredentialDto } from './dto/get-credential.dto';
import { SetCredentialDto } from './dto/set-credential.dto';
import { VerifyCredentialDto } from './dto/verify-credential.dto';

@ApiTags('Mobile — Credential (Customer MPIN)')
@Auth()
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
  @UseGuards(IdorGuard)
  @ApiOperation(
    mobileCustomerOp(
      'Get customer MPIN credential',
      'Returns the logged-in customer’s MPIN metadata from the mobile app. ' +
        'Uses the Keycloak user ID (`sub` from POST /auth/me). ' +
        'If `userId` is omitted, the authenticated Bearer token user is used. ' +
        'Passing a *different* customer’s userId requires a BANK_ADMIN/BANK_SUPER_ADMIN role.',
    ),
  )
  @ApiResponse({ status: 404, description: 'No MPIN credential exists for this customer' })
  get(@Body() dto: GetCredentialDto, @AuthenticatedUser() user: Record<string, unknown>) {
    return this.service.resolveGet(dto, user?.sub as string | undefined);
  }

  @Post('create')
  @UseGuards(IdorGuard)
  @ApiOperation(
    mobileCustomerOp(
      'Set customer MPIN (and optional password)',
      'Primary mobile-app onboarding endpoint. ' +
        '**MPIN** is hashed and stored locally for banking transactions in the mobile app. ' +
        '**Password** (optional) is written to Keycloak only. ' +
        'Use the customer’s Keycloak user ID (`sub` from POST /auth/me) as `userId` — setting ' +
        'a *different* customer’s credential requires a BANK_ADMIN/BANK_SUPER_ADMIN role.',
    ),
  )
  create(@Body() dto: SetCredentialDto) {
    return this.service.create(dto);
  }

  @Post('verify')
  @UseGuards(IdorGuard)
  @ApiOperation(
    mobileCustomerOp(
      'Verify customer MPIN',
      'Checks a submitted MPIN against the stored hash — for app-unlock / step-up-auth ' +
        'flows that need to confirm the MPIN without re-doing full Keycloak login. ' +
        'If `userId` is omitted, the authenticated Bearer token user is used.',
    ),
  )
  @ApiResponse({ status: 200, description: '{ verified: boolean }' })
  async verify(@Body() dto: VerifyCredentialDto, @AuthenticatedUser() user: Record<string, unknown>) {
    const keycloakUserId = dto.userId ?? (user?.sub as string);
    const verified = await this.service.verifyMpin(keycloakUserId, dto.mpin);
    return { verified };
  }

  @Post('delete')
  @UseGuards(IdorGuard)
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
