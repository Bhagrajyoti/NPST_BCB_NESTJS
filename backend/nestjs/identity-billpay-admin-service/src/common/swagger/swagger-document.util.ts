import { OpenAPIObject } from '@nestjs/swagger';

/** Routes that stay public at runtime (@Public) — Swagger must not require a bearer token. */
const PUBLIC_PATH_METHODS = new Set(
  [
    'POST /api/v1/auth/login',
    'POST /api/v1/auth/signup',
    'POST /api/v1/health/check',
    'POST /api/v1/auth/otp/create',
    'POST /api/v1/auth/otp/verify',
    'POST /api/v1/auth/registration/resume',
    'POST /api/v1/auth/registration/create',
    'POST /api/v1/auth/registration/verify-otp',
    'POST /api/v1/auth/registration/create-credentials',
    'POST /api/v1/auth/registration/register-device',
    'POST /api/v1/auth/registration/complete',
  ].map((k) => k.toLowerCase()),
);

/**
 * Swagger UI only sends the Authorize token when an operation (or the whole document)
 * declares bearer security. Per-route @ApiBearerAuth() is easy to miss; this sets a
 * default while keeping known public routes unauthenticated in the spec.
 */
export function applySwaggerSecurityDefaults(document: OpenAPIObject): void {
  document.security = [{ bearer: [] }];

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!operation || typeof operation !== 'object' || !('responses' in operation)) {
        continue;
      }

      const key = `${method.toLowerCase()} ${path}`.toLowerCase();
      if (PUBLIC_PATH_METHODS.has(key)) {
        operation.security = [];
      } else if (!operation.security) {
        operation.security = [{ bearer: [] }];
      }
    }
  }
}
