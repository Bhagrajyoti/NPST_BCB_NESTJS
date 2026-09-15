import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const META_UNPROTECTED = 'unprotected';

/**
 * E2E-only guard: requires a Bearer token and attaches the configured test actor to
 * request.user so global RolesGuard can enforce @Auth(...) the same way as production.
 */
@Injectable()
export class E2eTestAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly actor: Record<string, unknown> | null,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(META_UNPROTECTED, [
      context.getClass(),
      context.getHandler(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const hasBearer =
      typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ');

    if (isPublic) {
      return true;
    }

    if (!hasBearer) {
      throw new UnauthorizedException();
    }

    if (!this.actor) {
      throw new UnauthorizedException();
    }

    request.user = this.actor;
    return true;
  }
}
