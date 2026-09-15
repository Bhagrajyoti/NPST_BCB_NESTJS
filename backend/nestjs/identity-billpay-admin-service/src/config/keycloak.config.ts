import { registerAs } from '@nestjs/config';

export default registerAs('keycloak', () => ({
  // The effective token issuer is always `${authServerUrl}/realms/${realm}` — keycloak-connect
  // derives it internally and offers no separate override, so there is no standalone `issuer`
  // setting here. It must match the `iss` claim Keycloak actually stamps into issued tokens,
  // which in turn is controlled by the realm's Frontend URL (or KC_HOSTNAME) on the Keycloak
  // server itself, not by this service.
  authServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL,
  realm: process.env.KEYCLOAK_REALM,
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
  tokenValidation: process.env.KEYCLOAK_TOKEN_VALIDATION ?? 'offline',
  adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME,
  adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD,
}));
