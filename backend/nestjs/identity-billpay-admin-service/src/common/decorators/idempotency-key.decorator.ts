import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

import { IDEMPOTENCY_KEY_HEADER } from '../constants/idempotency.constants';
import { IdempotencyKeyInterceptor } from '../interceptors/idempotency-key.interceptor';

/**
 * Mutation endpoints that require a client-generated idempotency key on every request.
 * The key is read from the `Idempotency-Key` header (preferred); a legacy `idempotencyKey`
 * body field is still accepted when the header is omitted.
 */
export function IdempotencyKey() {
  return applyDecorators(
    UseInterceptors(IdempotencyKeyInterceptor),
    ApiHeader({
      name: IDEMPOTENCY_KEY_HEADER,
      description:
        'Client-generated unique key for this mutation. Reuse the same value when retrying the same payment after a timeout.',
      required: true,
      schema: { type: 'string', example: 'pay-unique-key-001' },
    }),
  );
}
