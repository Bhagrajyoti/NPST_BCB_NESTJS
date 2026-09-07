import { registerAs } from '@nestjs/config';

export default registerAs('keycloak', () => ({
  authServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL,
  issuer: process.env.KEYCLOAK_ISSUER,
  realm: process.env.KEYCLOAK_REALM,
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
  realmPublicKey: process.env.KEYCLOAK_REALM_PUBLIC_KEY,
  tokenValidation: process.env.KEYCLOAK_TOKEN_VALIDATION ?? 'offline',
  adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME,
  adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD,
}));
