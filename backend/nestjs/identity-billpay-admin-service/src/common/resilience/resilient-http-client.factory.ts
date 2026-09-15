import { HttpService } from '@nestjs/axios';
// tsconfig.json has no `esModuleInterop`, and opossum's types use `export = CircuitBreaker`
// (plain CJS) — a default import here type-checks (allowSyntheticDefaultImports) but silently
// resolves to `undefined` at runtime ("opossum_1.default is not a constructor"), since opossum
// doesn't have a `.default` property. `import X = require(...)` is the correct interop form.
import CircuitBreaker = require('opossum');

export interface ResilienceOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  retries: number;
}

const DEFAULT_OPTIONS: ResilienceOptions = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  retries: 2,
};

// opossum has no native retry concept (its `timeout` is a single-attempt clock) — so retries
// happen *inside* the wrapped action, before the breaker ever sees a result. That means the
// breaker's `timeout` must budget for every attempt + backoff, not just one; callers passing a
// tight `timeout` with a nonzero `retries` should widen it accordingly.
function withRetries<T>(
  action: (...args: unknown[]) => Promise<T>,
  retries: number,
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]) => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await action(...args);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          const backoffMs = 100 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
    throw lastError;
  };
}

// Wraps an HttpService call with timeout + retry + circuit breaker.
// All outbound clients (cbs.client.ts, notification.client.ts) go through this.
export function createResilientClient<T>(
  action: (...args: unknown[]) => Promise<T>,
  options: Partial<ResilienceOptions> = {},
): CircuitBreaker<unknown[], T> {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const breaker = new CircuitBreaker(withRetries(action, merged.retries), {
    timeout: merged.timeout,
    errorThresholdPercentage: merged.errorThresholdPercentage,
    resetTimeout: merged.resetTimeout,
  });
  return breaker;
}

export { HttpService };
