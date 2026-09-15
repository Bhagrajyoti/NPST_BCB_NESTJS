import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { IDEMPOTENCY_KEY_HEADER } from '../constants/idempotency.constants';

/**
 * Reads the client idempotency key from `Idempotency-Key` and merges it onto the JSON body
 * as `idempotencyKey` before validation and the route handler run.
 */
@Injectable()
export class IdempotencyKeyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      body?: Record<string, unknown>;
      headers: Record<string, string | string[] | undefined>;
    }>();

    const headerValue = request.headers[IDEMPOTENCY_KEY_HEADER];
    const fromHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const trimmedHeader = fromHeader?.trim();

    const body = request.body ?? {};
    const fromBody =
      typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';

    const idempotencyKey = trimmedHeader || fromBody;

    if (!idempotencyKey) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `Missing idempotency key — send the ${IDEMPOTENCY_KEY_HEADER} header`,
      });
    }

    request.body = { ...body, idempotencyKey };
    return next.handle();
  }
}
