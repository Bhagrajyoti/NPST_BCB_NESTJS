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
    const realmPublicKey = this.configService.get<string>('keycloak.realmPublicKey');
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
      realmPublicKey,
      verifyTokenAudience: false,
      policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
      tokenValidation,
    };
  }
}
