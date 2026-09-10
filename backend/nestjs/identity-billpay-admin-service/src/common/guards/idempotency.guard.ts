import { BadRequestException, CanActivate, ConflictException, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { IdempotencyRecord } from '../entities/idempotency-record.entity';

/**
 * Reads the `Idempotency-Key` header (see IdempotencyKey param decorator) and durably
 * records key+route+request-body-hash in `idempotency_record`. A repeat of the same key on
 * the same route with an identical body is let through again (callers may retry safely); a
 * repeat with a *different* body is rejected — the same key can't silently mean two
 * different requests. Apply via `@UseGuards(IdempotencyGuard)` on mutation endpoints where a
 * client retry (timeout, dropped connection) must not double-execute a side effect.
 *
 * `bill-payment/payment` already has its own bespoke idempotency handling on
 * CreatePaymentDto.idempotencyKey (a stored/returned duplicate-payment result) — this guard
 * is the generic version for endpoints that don't need that richer replay behavior.
 */
@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly repository: Repository<IdempotencyRecord>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key: string | undefined = request.headers['idempotency-key'];

    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required for this operation');
    }

    const route = `${request.method} ${request.route?.path ?? request.url}`;
    const requestHash = createHash('sha256').update(JSON.stringify(request.body ?? {})).digest('hex');

    const existing = await this.repository.findOne({ where: { idempotencyKey: key, route } });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException('Idempotency-Key was already used with a different request');
      }
      return true;
    }

    await this.repository.save(this.repository.create({ idempotencyKey: key, route, requestHash }));
    return true;
  }
}
