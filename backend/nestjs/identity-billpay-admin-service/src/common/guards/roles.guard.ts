import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

// registered globally via APP_GUARD
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
