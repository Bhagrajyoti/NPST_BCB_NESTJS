import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthGuard,
  KeycloakConnectModule,
  RoleGuard,
} from 'nest-keycloak-connect';
import { DataSourceOptions } from 'typeorm';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import keycloakConfig from './config/keycloak.config';
import { KeycloakConnectConfigService } from './config/keycloak-connect.config';

import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AdminModule } from './modules/admin/admin.module';
import { BillPaymentModule } from './modules/bill-payment/bill-payment.module';
import { HealthController } from './common/health/health.controller';

import { InternalEventBusModule } from './internal-events/internal-event-bus.module';
import { AuditOutboxModule } from './clients/audit-outbox/audit-outbox.module';
import { KeycloakAuthGuard } from './common/guards/keycloak-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantContextMiddleware } from './common/tenant/tenant-context.middleware';
import { BankConfigService } from './common/tenant/bank-config.service';

// Evaluated once, at module-definition time — main.ts loads `.env` via `dotenv/config`
// before this file is imported, so process.env is already populated here.
// AUTH_MOCK_MODE=true swaps every route's Keycloak enforcement for the fixed mock users in
// mock-users.const.ts (no real Keycloak server needed). Leave unset/false everywhere else.
const authGuardProviders =
  process.env.AUTH_MOCK_MODE === 'true'
    ? [
        { provide: APP_GUARD, useClass: KeycloakAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ]
    : [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RoleGuard },
      ];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, keycloakConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<DataSourceOptions>('database') as DataSourceOptions,
    }),
    KeycloakConnectModule.registerAsync({
      imports: [ConfigModule],
      useClass: KeycloakConnectConfigService,
    }),
    TerminusModule,
    // Without this, @Cron() (audit-outbox-relay.job.ts) is registered as metadata but never
    // actually scheduled — the app boots fine either way, so this gap is easy to miss.
    ScheduleModule.forRoot(),
    AuthModule,
    RbacModule,
    AdminModule,
    BillPaymentModule,
    InternalEventBusModule,
    AuditOutboxModule,
  ],
  controllers: [HealthController],
  providers: [...authGuardProviders, BankConfigService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}