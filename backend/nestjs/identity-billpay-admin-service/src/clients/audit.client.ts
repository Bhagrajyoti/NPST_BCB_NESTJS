import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
// See resilient-http-client.factory.ts for why this isn't a default import.
import CircuitBreaker = require('opossum');
import { firstValueFrom } from 'rxjs';
import { createResilientClient } from '../common/resilience/resilient-http-client.factory';

// Audit service client, wrapped via the resilience factory — used by AuditOutboxRelayJob to
// relay outbox rows. AUDIT_SERVICE_URL is unset in every environment configured so far (no
// real Audit service endpoint exists yet); relay() surfaces that plainly instead of pretending.
@Injectable()
export class AuditClient {
  private readonly breaker: CircuitBreaker<unknown[], unknown>;

  constructor(private readonly httpService: HttpService) {
    this.breaker = createResilientClient<unknown>(async (...args: unknown[]) => {
      const [url, body] = args as [string, unknown];
      const response = await firstValueFrom(this.httpService.post(url, body));
      return response.data;
    });
  }

  async relay(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const baseUrl = process.env.AUDIT_SERVICE_URL;
    if (!baseUrl) {
      throw new Error('AUDIT_SERVICE_URL is not configured — no Audit service to relay to');
    }
    await this.breaker.fire(`${baseUrl}/events`, { eventType, payload });
  }
}
