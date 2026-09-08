import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isSuperadmin } from '../constants/rbac.constants';

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: Record<string, unknown> }>();
    if (!request.user) {
      throw new UnauthorizedException('Keycloak access token is required');
    }
    if (!isSuperadmin(request.user)) {
      throw new ForbiddenException('Only superadmin users can perform this operation');
    }
    return true;
  }
}
