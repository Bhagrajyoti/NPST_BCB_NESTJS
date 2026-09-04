import { registerAs } from '@nestjs/config';

export default registerAs('keycloakAdmin', () => ({
  baseUrl: process.env.KEYCLOAK_AUTH_SERVER_URL,
  realm: process.env.KEYCLOAK_REALM,
}));
