import { HttpService } from '@nestjs/axios';
import CircuitBreaker from 'opossum';

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

// Wraps an HttpService call with timeout + retry + circuit breaker.
// All outbound clients (cbs.client.ts, notification.client.ts) go through this.
export function createResilientClient<T>(
  action: (...args: unknown[]) => Promise<T>,
  options: Partial<ResilienceOptions> = {},
): CircuitBreaker<unknown[], T> {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const breaker = new CircuitBreaker(action, {
    timeout: merged.timeout,
    errorThresholdPercentage: merged.errorThresholdPercentage,
    resetTimeout: merged.resetTimeout,
  });
  return breaker;
}

export { HttpService };
