import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from '../token/dto/login.dto';
import { LogoutDto } from '../token/dto/logout.dto';
import { SignupDto } from '../token/dto/signup.dto';
import { TokenResponseDto } from '../token/dto/token-response.dto';
import { findMockUserByUsername } from './mock-users.const';

const SIGNUP_ROLE = 'RETAIL_CUSTOMER';

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  scope: string;
}

@Injectable()
export class KeycloakService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private tokenUrl(): string {
    const base = this.configService.get<string>('keycloak.authServerUrl');
    const realm = this.configService.get<string>('keycloak.realm');
    return `${base}/realms/${realm}/protocol/openid-connect/token`;
  }

  private logoutUrl(): string {
    const base = this.configService.get<string>('keycloak.authServerUrl');
    const realm = this.configService.get<string>('keycloak.realm');
    return `${base}/realms/${realm}/protocol/openid-connect/logout`;
  }

  private resolveClient(clientId?: string): { clientId: string; clientSecret?: string } {
    const resolvedId =
      clientId ?? this.configService.get<string>('keycloak.clientId') ?? 'admin-web';

    if (resolvedId === 'mobile-app') {
      return { clientId: resolvedId };
    }

    return {
      clientId: resolvedId,
      clientSecret: this.configService.get<string>('keycloak.clientSecret'),
    };
  }

  private isMockAuth(): boolean {
    return this.configService.get<string>('app.authMockMode') === 'true';
  }

  private mockLogin(dto: LoginDto): TokenResponseDto {
    const user = findMockUserByUsername(dto.username);
    if (!user || user.password !== dto.password) {
      throw new UnauthorizedException('Invalid user credentials');
    }
    return {
      accessToken: `mock-${user.username}-token`,
      expiresIn: 86400,
      refreshExpiresIn: 172800,
      refreshToken: `mock-${user.username}-refresh`,
      tokenType: 'Bearer',
      scope: 'openid profile email',
    };
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    if (this.isMockAuth()) {
      return this.mockLogin(dto);
    }

    const client = this.resolveClient(dto.clientId);
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: client.clientId,
      username: dto.username,
      password: dto.password,
    });

    if (client.clientSecret) {
      body.set('client_secret', client.clientSecret);
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<KeycloakTokenResponse>(this.tokenUrl(), body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshExpiresIn: data.refresh_expires_in,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      const axiosError = error as AxiosError<{ error_description?: string; error?: string }>;
      const message =
        axiosError.response?.data?.error_description ??
        axiosError.response?.data?.error ??
        'Login failed';
      throw new UnauthorizedException(message);
    }
  }

  async logout(dto: LogoutDto): Promise<{ loggedOut: boolean }> {
    if (this.isMockAuth()) {
      return { loggedOut: dto.refreshToken.startsWith('mock-') };
    }

    const client = this.resolveClient(dto.clientId);
    const body = new URLSearchParams({
      client_id: client.clientId,
      refresh_token: dto.refreshToken,
    });

    if (client.clientSecret) {
      body.set('client_secret', client.clientSecret);
    }

    try {
      await firstValueFrom(
        this.httpService.post(this.logoutUrl(), body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return { loggedOut: true };
    } catch (error) {
      const axiosError = error as AxiosError<{ error_description?: string; error?: string }>;
      const message =
        axiosError.response?.data?.error_description ??
        axiosError.response?.data?.error ??
        'Logout failed';
      throw new UnauthorizedException(message);
    }
  }

  /**
   * Self-service account creation: creates a real Keycloak user (role RETAIL_CUSTOMER) from
   * just a username/password, so it can be used with POST /auth/login right away — no OTP,
   * device, or multi-step saga (contrast with POST /auth/registration/*, which exists for the
   * full customer-onboarding flow). Not affected by AUTH_MOCK_MODE — like createUser/
   * assignRealmRoleToUser, this always calls the real Keycloak Admin API.
   */
  async signup(dto: SignupDto): Promise<{ keycloakUserId: string; username: string }> {
    const existing = await this.findUsersByUsername(dto.username);
    if (existing.length > 0) {
      throw new ConflictException(`Username ${dto.username} already exists`);
    }

    const user = await this.createUser({
      username: dto.username,
      email: dto.email ?? `${dto.username}@signup.bharat-banking.local`,
      firstName: dto.firstName ?? dto.username,
      lastName: dto.lastName ?? dto.username,
      password: dto.password,
      enabled: true,
    });

    await this.assignRealmRoleToUser(user.id, SIGNUP_ROLE);

    return { keycloakUserId: user.id, username: dto.username };
  }

  private adminBaseUrl(): string {
    const base = this.configService.get<string>('keycloak.authServerUrl');
    const realm = this.configService.get<string>('keycloak.realm');
    return `${base}/admin/realms/${realm}`;
  }

  private async getAdminAccessToken(): Promise<string> {
    const username = this.configService.get<string>('keycloak.adminUsername');
    const password = this.configService.get<string>('keycloak.adminPassword');
    const base = this.configService.get<string>('keycloak.authServerUrl');

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: username ?? '',
      password: password ?? '',
    });

    const { data } = await firstValueFrom(
      this.httpService.post<KeycloakTokenResponse>(
        `${base}/realms/master/protocol/openid-connect/token`,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );

    return data.access_token;
  }

  private adminHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async createRealmRole(payload: {
    name: string;
    description?: string;
  }): Promise<{ id: string; name: string }> {
    const token = await this.getAdminAccessToken();
    const createResponse = await firstValueFrom(
      this.httpService.post(
        `${this.adminBaseUrl()}/roles`,
        { name: payload.name, description: payload.description ?? '' },
        { headers: this.adminHeaders(token), validateStatus: (s) => s < 500 },
      ),
    );

    // 409 means the realm role already exists (e.g. pre-seeded in Keycloak) —
    // that's fine, we just want its id, not a duplicate.
    if (createResponse.status >= 400 && createResponse.status !== 409) {
      const message =
        (createResponse.data as { errorMessage?: string })?.errorMessage ??
        'Keycloak role creation failed';
      throw new UnauthorizedException(message);
    }

    const { data } = await firstValueFrom(
      this.httpService.get<{ id: string; name: string }>(
        `${this.adminBaseUrl()}/roles/${encodeURIComponent(payload.name)}`,
        { headers: this.adminHeaders(token) },
      ),
    );

    return { id: data.id, name: data.name };
  }

  async updateRealmRole(
    roleName: string,
    payload: { description?: string },
  ): Promise<void> {
    const token = await this.getAdminAccessToken();
    const { data: existing } = await firstValueFrom(
      this.httpService.get<{ id: string; name: string; description?: string }>(
        `${this.adminBaseUrl()}/roles/${encodeURIComponent(roleName)}`,
        { headers: this.adminHeaders(token) },
      ),
    );

    await firstValueFrom(
      this.httpService.put(
        `${this.adminBaseUrl()}/roles/${encodeURIComponent(roleName)}`,
        {
          id: existing.id,
          name: existing.name,
          description: payload.description ?? existing.description ?? '',
        },
        { headers: this.adminHeaders(token) },
      ),
    );
  }

  async createUser(payload: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    enabled?: boolean;
  }): Promise<{ id: string }> {
    const token = await this.getAdminAccessToken();

    const createResponse = await firstValueFrom(
      this.httpService.post(
        `${this.adminBaseUrl()}/users`,
        {
          username: payload.username,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          enabled: payload.enabled ?? true,
          emailVerified: true,
        },
        { headers: this.adminHeaders(token), validateStatus: (s) => s < 500 },
      ),
    );

    if (createResponse.status >= 400) {
      const message =
        (createResponse.data as { errorMessage?: string })?.errorMessage ?? 'Keycloak user creation failed';
      throw new UnauthorizedException(message);
    }

    const location = createResponse.headers.location as string | undefined;
    const userId = location?.split('/').pop();
    if (!userId) {
      const users = await this.findUsersByUsername(payload.username);
      if (!users.length) {
        throw new UnauthorizedException('Keycloak user created but ID could not be resolved');
      }
      await this.setUserPassword(users[0].id, payload.password, token);
      return { id: users[0].id };
    }

    await this.setUserPassword(userId, payload.password, token);
    return { id: userId };
  }

  private async setUserPassword(
    userId: string,
    password: string,
    token?: string,
  ): Promise<void> {
    const accessToken = token ?? (await this.getAdminAccessToken());
    await firstValueFrom(
      this.httpService.put(
        `${this.adminBaseUrl()}/users/${userId}/reset-password`,
        { type: 'password', value: password, temporary: false },
        { headers: this.adminHeaders(accessToken) },
      ),
    );
  }

  async resetUserPassword(userId: string, password: string): Promise<void> {
    await this.setUserPassword(userId, password);
  }

  async removeRealmRoleFromUser(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminAccessToken();
    const { data: role } = await firstValueFrom(
      this.httpService.get<{ id: string; name: string }>(
        `${this.adminBaseUrl()}/roles/${encodeURIComponent(roleName)}`,
        { headers: this.adminHeaders(token) },
      ),
    );

    await firstValueFrom(
      this.httpService.delete(`${this.adminBaseUrl()}/users/${userId}/role-mappings/realm`, {
        headers: this.adminHeaders(token),
        data: [role],
      }),
    );
  }

  async assignRealmRoleToUser(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminAccessToken();
    const { data: role } = await firstValueFrom(
      this.httpService.get<{ id: string; name: string }>(
        `${this.adminBaseUrl()}/roles/${encodeURIComponent(roleName)}`,
        { headers: this.adminHeaders(token) },
      ),
    );

    await firstValueFrom(
      this.httpService.post(
        `${this.adminBaseUrl()}/users/${userId}/role-mappings/realm`,
        [role],
        { headers: this.adminHeaders(token) },
      ),
    );
  }

  async getUserRealmRoles(userId: string): Promise<Array<{ id: string; name: string }>> {
    const token = await this.getAdminAccessToken();
    const { data } = await firstValueFrom(
      this.httpService.get<Array<{ id: string; name: string }>>(
        `${this.adminBaseUrl()}/users/${userId}/role-mappings/realm`,
        { headers: this.adminHeaders(token) },
      ),
    );
    return data;
  }

  async findUsersByUsername(
    username: string,
  ): Promise<Array<{ id: string; username: string; email?: string; firstName?: string; lastName?: string; enabled?: boolean }>> {
    const token = await this.getAdminAccessToken();
    const { data } = await firstValueFrom(
      this.httpService.get<
        Array<{ id: string; username: string; email?: string; firstName?: string; lastName?: string; enabled?: boolean }>
      >(`${this.adminBaseUrl()}/users?username=${encodeURIComponent(username)}&exact=true`, {
        headers: this.adminHeaders(token),
      }),
    );
    return data;
  }

  async findUsers(filters: {
    username?: string;
    email?: string;
    keycloakUserId?: string;
  }): Promise<Array<{ id: string; username: string; email?: string; firstName?: string; lastName?: string; enabled?: boolean }>> {
    const token = await this.getAdminAccessToken();

    if (filters.keycloakUserId) {
      const { data } = await firstValueFrom(
        this.httpService.get<{ id: string; username: string; email?: string; firstName?: string; lastName?: string; enabled?: boolean }>(
          `${this.adminBaseUrl()}/users/${filters.keycloakUserId}`,
          { headers: this.adminHeaders(token), validateStatus: (s) => s < 500 },
        ),
      );
      if (!data || (data as { error?: string }).error) {
        return [];
      }
      return [data];
    }

    const params = new URLSearchParams();
    if (filters.username) {
      params.set('username', filters.username);
      params.set('exact', 'true');
    }
    if (filters.email) {
      params.set('email', filters.email);
      params.set('exact', 'true');
    }
    params.set('max', '100');

    const { data } = await firstValueFrom(
      this.httpService.get<
        Array<{ id: string; username: string; email?: string; firstName?: string; lastName?: string; enabled?: boolean }>
      >(`${this.adminBaseUrl()}/users?${params.toString()}`, { headers: this.adminHeaders(token) }),
    );
    return data;
  }

  async disableUser(userId: string): Promise<void> {
    const token = await this.getAdminAccessToken();
    await firstValueFrom(
      this.httpService.put(
        `${this.adminBaseUrl()}/users/${userId}`,
        { enabled: false },
        { headers: this.adminHeaders(token) },
      ),
    );
  }

  async forceLogout(userId: string): Promise<void> {
    const token = await this.getAdminAccessToken();
    await firstValueFrom(
      this.httpService.post(
        `${this.adminBaseUrl()}/users/${userId}/logout`,
        {},
        { headers: this.adminHeaders(token) },
      ),
    );
  }
}
