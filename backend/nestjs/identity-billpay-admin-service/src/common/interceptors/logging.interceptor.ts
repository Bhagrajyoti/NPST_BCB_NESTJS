import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { maskEmail, maskMobile } from '../utils/masking.util';

const MOBILE_KEY_PATTERN = /mobile|phone/i;
const EMAIL_KEY_PATTERN = /email/i;
const MOBILE_VALUE_PATTERN = /^\d{10}$/;

// Masks any field whose key name looks like a mobile number or email before it's logged —
// applied recursively so nested DTOs/entities are covered, not just top-level fields.
function maskPii(value: unknown, keyHint?: string): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    if (keyHint && MOBILE_KEY_PATTERN.test(keyHint) && MOBILE_VALUE_PATTERN.test(value)) {
      return maskMobile(value);
    }
    if (keyHint && EMAIL_KEY_PATTERN.test(keyHint) && value.includes('@')) {
      return maskEmail(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskPii(item));
  }

  if (typeof value === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      masked[key] = maskPii(val, key);
    }
    return masked;
  }

  return value;
}

// Registered globally in main.ts. Masking is enforced here, not left to callers —
// nothing downstream needs to remember to call maskMobile/maskEmail itself.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const start = Date.now();

    this.logger.log(`--> ${method} ${url} ${JSON.stringify(maskPii(body))}`);

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const ms = Date.now() - start;
          this.logger.log(`<-- ${method} ${url} ${ms}ms ${JSON.stringify(maskPii(responseBody))}`);
        },
        error: (error: Error) => {
          const ms = Date.now() - start;
          this.logger.warn(`<-x ${method} ${url} ${ms}ms ${error?.message ?? error}`);
        },
      }),
    );
  }
}
