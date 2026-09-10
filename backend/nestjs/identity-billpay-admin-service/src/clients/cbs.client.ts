import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
// See resilient-http-client.factory.ts for why this isn't a default import.
import CircuitBreaker = require('opossum');
import { firstValueFrom } from 'rxjs';
import { createResilientClient } from '../common/resilience/resilient-http-client.factory';

type HttpArgs = ['get' | 'post', string, unknown?];

// Core Banking System client, wrapped via the resilience factory (timeout + retry +
// circuit breaker) — no direct httpService.get/post call bypasses this.
@Injectable()
export class CbsClient {
  private readonly breaker: CircuitBreaker<unknown[], unknown>;

  constructor(private readonly httpService: HttpService) {
    this.breaker = createResilientClient<unknown>(async (...args: unknown[]) => {
      const [method, url, body] = args as HttpArgs;
      const response =
        method === 'get'
          ? await firstValueFrom(this.httpService.get(url))
          : await firstValueFrom(this.httpService.post(url, body));
      return response.data;
    });
  }

  async get<T>(url: string): Promise<T> {
    return this.breaker.fire('get', url) as Promise<T>;
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    return this.breaker.fire('post', url, body) as Promise<T>;
  }
}
