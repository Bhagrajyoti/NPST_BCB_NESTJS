import { NextFunction, Request, Response } from 'express';

/**
 * Swagger users often paste "Bearer <token>" into the Authorize dialog, which
 * produces "Authorization: Bearer Bearer <token>" and fails auth with 401.
 */
export function normalizeBearerMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    next();
    return;
  }

  let token = authHeader.trim();
  while (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, '').trim();
  }

  if (token) {
    req.headers.authorization = `Bearer ${token}`;
  }

  next();
}
