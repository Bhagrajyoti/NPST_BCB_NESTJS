import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Counterpart to ChecksumGuard: signs this response with an `X-Checksum` header
 * (HMAC-SHA256 of the JSON body, same CHECKSUM_SHARED_SECRET) so a calling Spring Boot
 * service can verify the response wasn't tampered with in transit.
 *
 * Same status as ChecksumGuard — real logic, not yet applied to any route pending the
 * Java-side contract (see checksum.guard.ts). A no-op (no header set) whenever
 * CHECKSUM_SHARED_SECRET is unset, so it's harmless to leave registered.
 */
@Injectable()
export class ChecksumSigningInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const secret = this.configService.get<string>('app.checksumSharedSecret');
    if (!secret) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      tap((body) => {
        const checksum = createHmac('sha256', secret)
          .update(JSON.stringify(body ?? {}))
          .digest('hex');
        response.setHeader('X-Checksum', checksum);
      }),
    );
  }
}
