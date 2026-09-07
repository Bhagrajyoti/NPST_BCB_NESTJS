import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import keycloakConfig from './config/keycloak.config';

import { AuthModule } from './modules/auth/auth.module';
import { BillPaymentModule } from './modules/bill-payment/bill-payment.module';
import { AdminModule } from './modules/admin/admin.module';

import { TemplatesModule } from './common/templates/templates.module';
import { HealthController } from './common/health/health.controller';

import { InternalEventBusModule } from './internal-events/internal-event-bus.module';
import { AuditOutboxModule } from './clients/audit-outbox/audit-outbox.module';

import { KeycloakAuthGuard } from './common/guards/keycloak-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, keycloakConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    InternalEventBusModule,
    AuditOutboxModule,
    TemplatesModule,
    AuthModule,
    BillPaymentModule,
    AdminModule,
    TerminusModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: KeycloakAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
