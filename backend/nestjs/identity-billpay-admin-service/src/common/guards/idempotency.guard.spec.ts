import { BadRequestException, ConflictException, ExecutionContext } from '@nestjs/common';
import { createHash } from 'crypto';
import { IdempotencyGuard } from './idempotency.guard';

function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

function contextWith(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('IdempotencyGuard', () => {
  let repository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let guard: IdempotencyGuard;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    guard = new IdempotencyGuard(repository as any);
  });

  it('rejects a request with no Idempotency-Key header', async () => {
    const ctx = contextWith({ headers: {}, method: 'POST', url: '/x', body: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('records a first-seen key and lets the request through', async () => {
    repository.findOne.mockResolvedValue(null);
    const ctx = contextWith({
      headers: { 'idempotency-key': 'key-1' },
      method: 'POST',
      url: '/x',
      body: { a: 1 },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(repository.save).toHaveBeenCalled();
  });

  it('lets an exact replay (same key, same body) through without re-recording', async () => {
    const requestHash = hashBody({ a: 1 });
    repository.findOne.mockResolvedValue({ idempotencyKey: 'key-1', route: 'POST /x', requestHash });
    const ctx = contextWith({
      headers: { 'idempotency-key': 'key-1' },
      method: 'POST',
      url: '/x',
      body: { a: 1 },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects the same key reused with a different body', async () => {
    const requestHash = hashBody({ a: 1 });
    repository.findOne.mockResolvedValue({ idempotencyKey: 'key-1', route: 'POST /x', requestHash });
    const ctx = contextWith({
      headers: { 'idempotency-key': 'key-1' },
      method: 'POST',
      url: '/x',
      body: { a: 999 },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ConflictException);
  });
});
