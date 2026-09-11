/**
 * Route prefix helpers for running behind an API gateway that exposes this service at
 * `{host}:{port}/identity/api/v1/...`. The gateway owns `/identity`; the app stays at `/api/v1`.
 */
export function resolveApiGlobalPrefix(): string {
  const raw = (process.env.API_GLOBAL_PREFIX ?? 'api/v1').replace(/^\/+|\/+$/g, '');

  if (raw.startsWith('identity/')) {
    // Backward-compatible guard: older server env files duplicated the gateway segment.
    return raw.slice('identity/'.length) || 'api/v1';
  }

  return raw || 'api/v1';
}

/** External gateway path segment, e.g. `identity` → public URLs start with `/identity/...` */
export function resolveGatewayPathPrefix(): string {
  return (process.env.GATEWAY_PATH_PREFIX ?? '').replace(/^\/+|\/+$/g, '');
}

export function buildPublicPath(gatewayPrefix: string, appPath: string): string {
  const normalizedAppPath = appPath.replace(/^\/+/, '');
  if (!gatewayPrefix) {
    return normalizedAppPath ? `/${normalizedAppPath}` : '/';
  }
  return normalizedAppPath ? `/${gatewayPrefix}/${normalizedAppPath}` : `/${gatewayPrefix}`;
}
