import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Validates inbound calls from Spring Boot services: the caller must send an
 * `X-Checksum` header equal to HMAC-SHA256(JSON body, CHECKSUM_SHARED_SECRET) in hex.
 *
 * NOT applied to any route yet. Per NestJS_Service_Architecture_FINAL.md §6, the exact
 * contract (header name, secret scoping, which routes live under `/internal/**`) is an open
 * item that "must match exactly on both sides" and is explicitly pending confirmation from
 * the Java/Spring Boot team — wiring this onto a guessed route now would risk locking in a
 * contract the other side hasn't agreed to. The logic below is real and ready; apply it with
 * `@UseGuards(ChecksumGuard)` once that contract is confirmed.
 */
@Injectable()
export class ChecksumGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.configService.get<string>('app.checksumSharedSecret');
    if (!secret) {
      throw new UnauthorizedException(
        'Checksum verification is not configured (CHECKSUM_SHARED_SECRET unset)',
      );
    }

    const request = context.switchToHttp().getRequest();
    const provided: string | undefined = request.headers['x-checksum'];
    if (!provided) {
      throw new UnauthorizedException('Missing X-Checksum header');
    }

    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(request.body ?? {}))
      .digest('hex');

    let providedBuf: Buffer;
    let expectedBuf: Buffer;
    try {
      providedBuf = Buffer.from(provided, 'hex');
      expectedBuf = Buffer.from(expected, 'hex');
    } catch {
      throw new UnauthorizedException('Invalid checksum');
    }

    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
      throw new UnauthorizedException('Invalid checksum');
    }

    return true;
  }
}
