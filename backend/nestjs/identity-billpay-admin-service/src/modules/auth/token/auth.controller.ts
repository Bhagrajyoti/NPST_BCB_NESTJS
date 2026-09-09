import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import { Auth } from '../../../common/decorators/auth.decorator';
import { KeycloakService } from '../keycloak/keycloak.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { TokenResponseDto } from './dto/token-response.dto';

/**
 * This service holds no server-side session state — every route here is a thin,
 * stateless wrapper over Keycloak's OpenID Connect token endpoint. Authentication
 * is fully delegated to the Keycloak-issued bearer token, validated per-request
 * by the global AuthGuard (see KeycloakConnectConfigService).
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly keycloakService: KeycloakService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticates a user against Keycloak (bharat-banking realm) using username/password. ' +
      'Returns access and refresh tokens. Use accessToken as Bearer token for protected APIs.',
  })
  @ApiResponse({ status: 200, description: 'Login successful', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or Keycloak error' })
  login(@Body() dto: LoginDto) {
    return this.keycloakService.login(dto);
  }

  @Post('logout')
  @Auth()
  @ApiOperation({
    summary: 'Logout',
    description:
      'Ends the Keycloak session by revoking the refresh token returned from login. ' +
      'Pass the same clientId used during login. Requires a valid Bearer access token.',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  logout(@Body() dto: LogoutDto) {
    return this.keycloakService.logout(dto);
  }

  @Post('me')
  @Auth()
  @ApiOperation({
    summary: 'Current user profile',
    description:
      'Returns the decoded JWT claims for the authenticated user. ' +
      'Requires a valid Bearer access token from login.',
  })
  @ApiResponse({ status: 200, description: 'User claims from JWT' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  me(
    @AuthenticatedUser() user: Record<string, unknown>,
    @Req() req: { user?: Record<string, unknown> },
  ) {
    return {
      user: user ?? req.user ?? null,
    };
  }
}
