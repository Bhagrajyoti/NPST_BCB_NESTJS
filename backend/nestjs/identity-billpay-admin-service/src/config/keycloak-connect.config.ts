import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KeycloakConnectOptions,
  KeycloakConnectOptionsFactory,
  PolicyEnforcementMode,
  TokenValidation,
} from 'nest-keycloak-connect';

@Injectable()
export class KeycloakConnectConfigService implements KeycloakConnectOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createKeycloakConnectOptions(): KeycloakConnectOptions {
    const authServerUrl = this.configService.get<string>('keycloak.authServerUrl');
    const realm = this.configService.get<string>('keycloak.realm');
    const clientId = this.configService.get<string>('keycloak.clientId');
    const secret = this.configService.get<string>('keycloak.clientSecret') ?? '';
    const tokenValidationMode = this.configService.get<string>('keycloak.tokenValidation');

    if (!authServerUrl || !realm || !clientId) {
      throw new Error(
        'Keycloak is not configured. Set KEYCLOAK_AUTH_SERVER_URL, KEYCLOAK_REALM, and KEYCLOAK_CLIENT_ID.',
      );
    }

    const tokenValidation =
      tokenValidationMode === 'online' ? TokenValidation.ONLINE : TokenValidation.OFFLINE;

    return {
      authServerUrl,
      realm,
      clientId,
      secret,
      bearerOnly: true,
      // Deliberately no `realmPublicKey`: a hand-pasted static key goes stale the moment
      // Keycloak rotates its signing key, which fails every offline token validation with
      // "invalid token (signature)" while login (validated server-side by Keycloak) keeps
      // working — the exact symptom of "token issued, but every protected call 401s".
      // Omitting it makes keycloak-connect fetch and cache signing keys from the realm's
      // JWKS endpoint (`${authServerUrl}/realms/${realm}/protocol/openid-connect/certs`),
      // keyed by the token's `kid`, so key rotation is handled automatically. This is the
      // standard approach for production Keycloak integrations.
      verifyTokenAudience: false,
      policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
      tokenValidation,
    };
  }
}
