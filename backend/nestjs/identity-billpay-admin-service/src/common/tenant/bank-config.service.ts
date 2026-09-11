import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BankConfig {
  bankId: string;
  bankName: string;
  keycloakRealm: string;
}

/**
 * Per-tenant config lookup. Today this deployment only ever runs for one bank (all config
 * comes from process-wide env vars — there's no multi-bank config store yet), so this
 * resolves to a single BankConfig regardless of the id asked for. The `bankId` parameter and
 * map-shaped internals exist so a real multi-tenant config source (DB table, config service
 * call) can replace `defaultConfig` without changing TenantContextMiddleware's call site.
 */
@Injectable()
export class BankConfigService {
  constructor(private readonly configService: ConfigService) {}

  private defaultConfig(): BankConfig {
    return {
      bankId: process.env.BANK_ID ?? 'default',
      bankName: process.env.BANK_NAME ?? 'Bharat Banking',
      keycloakRealm: this.configService.get<string>('keycloak.realm') ?? 'bharat-banking',
    };
  }

  getConfig(_bankId?: string): BankConfig {
    return this.defaultConfig();
  }
}
