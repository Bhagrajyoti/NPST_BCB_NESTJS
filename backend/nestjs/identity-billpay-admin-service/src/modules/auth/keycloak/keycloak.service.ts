import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Talks to the Keycloak Admin API: create/disable user, force logout.
@Injectable()
export class KeycloakService {
  constructor(private readonly configService: ConfigService) {}

  async createUser(_payload: { username: string; email?: string }): Promise<{ id: string }> {
    throw new Error('Not implemented');
  }

  async disableUser(_userId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async forceLogout(_userId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
