import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import { KeycloakService } from '../keycloak/keycloak.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@ApiTags('Auth — Session')
@Controller('auth')
export class SessionController {
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

  @Public()
  @Post('logout')
  @ApiOperation({
    summary: 'Logout',
    description:
      'Ends the Keycloak session by revoking the refresh token returned from login. ' +
      'Pass the same clientId used during login.',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  logout(@Body() dto: LogoutDto) {
    return this.keycloakService.logout(dto);
  }

  @Post('session/me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Current user profile',
    description:
      'Returns the decoded JWT claims for the authenticated user. ' +
      'Requires a valid Bearer access token from login.',
  })
  @ApiResponse({ status: 200, description: 'User claims from JWT' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  me(@AuthenticatedUser() user: Record<string, unknown>, @Req() req: { user?: Record<string, unknown> }) {
    return {
      user: user ?? req.user ?? null,
    };
  }
}
