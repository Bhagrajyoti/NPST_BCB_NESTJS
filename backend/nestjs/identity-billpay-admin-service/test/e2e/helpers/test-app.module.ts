import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { KeycloakConnectModule } from 'nest-keycloak-connect';
import { DataSourceOptions } from 'typeorm';

import appConfig from '../../../src/config/app.config';
import databaseConfig from '../../../src/config/database.config';
import keycloakConfig from '../../../src/config/keycloak.config';
import { KeycloakConnectConfigService } from '../../../src/config/keycloak-connect.config';
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { RbacModule } from '../../../src/modules/rbac/rbac.module';
import { HealthController } from '../../../src/common/health/health.controller';

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
    AuthModule,
    RbacModule,
  ],
  controllers: [HealthController],
})
export class TestAppModule {}
