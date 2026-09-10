// NestJS core decorators: @Body reads the parsed request body, @Controller declares this class as a route handler, @Post maps a method to an HTTP POST route, @Req gives access to the raw Express request.
import { Body, Controller, Post, Req } from '@nestjs/common';
// Swagger/OpenAPI decorators used to document these routes in the generated API docs (served by @nestjs/swagger at app bootstrap).
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
// From the `nest-keycloak-connect` package: @AuthenticatedUser injects the decoded JWT claims of the caller; @Public marks a route as exempt from the global Keycloak AuthGuard.
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
// Local decorator (src/common/decorators/auth.decorator.ts) that bundles Swagger's @ApiBearerAuth with nest-keycloak-connect's @Roles metadata, enforced app-wide by the global AuthGuard/RoleGuard.
import { Auth } from '../../../common/decorators/auth.decorator';
// Service (../keycloak/keycloak.service.ts) that talks to the actual Keycloak server over HTTP for login/logout/token operations.
import { KeycloakService } from '../keycloak/keycloak.service';
// DTO (./dto/login.dto.ts) validating/shaping the login request body (username, password, optional clientId).
import { LoginDto } from './dto/login.dto';
// DTO (./dto/logout.dto.ts) validating/shaping the logout request body (refreshToken, optional clientId).
import { LogoutDto } from './dto/logout.dto';
// DTO (./dto/token-response.dto.ts) describing the shape of the token payload returned to callers, used here only for Swagger response typing.
import { TokenResponseDto } from './dto/token-response.dto';

/**
 * This service holds no server-side session state — every route here is a thin,
 * stateless wrapper over Keycloak's OpenID Connect token endpoint. Authentication
 * is fully delegated to the Keycloak-issued bearer token, validated per-request
 * by the global AuthGuard (see KeycloakConnectConfigService).
 */
// Groups these routes under the "Auth" tag in the Swagger UI.
@ApiTags('Auth')
// Registers this class as a controller; all routes below are prefixed with /auth.
@Controller('auth')
export class AuthController {
  // Injects KeycloakService via Nest's DI container so route handlers can delegate to it.
  constructor(private readonly keycloakService: KeycloakService) {}

  // Exempts this route from the global Keycloak AuthGuard — no bearer token is required to hit /auth/login (it's how a token is obtained in the first place).
  @Public()
  // Maps this handler to POST /auth/login.
  @Post('login')
  // Swagger metadata: short summary and longer description shown in the API docs for this endpoint.
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticates a user against Keycloak (bharat-banking realm) using username/password. ' +
      'Returns access and refresh tokens. Use accessToken as Bearer token for protected APIs.',
  })
  // Swagger doc: describes the 200 success response shape, referencing TokenResponseDto.
  @ApiResponse({ status: 200, description: 'Login successful', type: TokenResponseDto })
  // Swagger doc: describes the 401 error response for bad credentials or Keycloak errors.
  @ApiResponse({ status: 401, description: 'Invalid credentials or Keycloak error' })
  // Handler: takes the validated LoginDto from the request body...
  login(@Body() dto: LoginDto) {
    // ...and forwards it to KeycloakService.login, which calls Keycloak's /protocol/openid-connect/token endpoint (grant_type=password) and returns access/refresh tokens.
    return this.keycloakService.login(dto);
  }

  // Maps this handler to POST /auth/logout.
  @Post('logout')
  // Requires a valid Keycloak bearer token (enforced globally by AuthGuard/RoleGuard); also adds the Swagger "Bearer" auth requirement to this route's docs.
  @Auth()
  // Swagger metadata: short summary and description for the logout endpoint.
  @ApiOperation({
    summary: 'Logout',
    description:
      'Ends the Keycloak session by revoking the refresh token returned from login. ' +
      'Pass the same clientId used during login. Requires a valid Bearer access token.',
  })
  // Swagger doc: 200 response when logout succeeds.
  @ApiResponse({ status: 200, description: 'Logout successful' })
  // Swagger doc: 401 response when the refresh token is invalid or expired.
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  // Handler: takes the validated LogoutDto (refreshToken + optional clientId) from the body...
  logout(@Body() dto: LogoutDto) {
    // ...and forwards it to KeycloakService.logout, which calls Keycloak's /protocol/openid-connect/logout endpoint to revoke the refresh token.
    return this.keycloakService.logout(dto);
  }

  // Maps this handler to POST /auth/me.
  @Post('me')
  // Requires a valid Keycloak bearer token, same as /auth/logout above.
  @Auth()
  // Swagger metadata: short summary and description for the "current user" endpoint.
  @ApiOperation({
    summary: 'Current user profile',
    description:
      'Returns the decoded JWT claims for the authenticated user. ' +
      'Requires a valid Bearer access token from login.',
  })
  // Swagger doc: 200 response containing the JWT claims.
  @ApiResponse({ status: 200, description: 'User claims from JWT' })
  // Swagger doc: 401 response when the token is missing or invalid.
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  me(
    // @AuthenticatedUser() (from nest-keycloak-connect) extracts the decoded JWT payload that the global AuthGuard already validated and attached to the request.
    @AuthenticatedUser() user: Record<string, unknown>,
    // Falls back to reading req.user directly (populated by the same AuthGuard/Passport strategy) in case the decorator returns nothing.
    @Req() req: { user?: Record<string, unknown> },
  ) {
    // Returns whichever source has the claims, or null if neither is populated.
    return {
      user: user ?? req.user ?? null,
    };
  }
}
