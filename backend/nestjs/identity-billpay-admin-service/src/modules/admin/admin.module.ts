import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalEventBusModule } from '../../internal-events/internal-event-bus.module';
import { AdminUserController } from './admin-user/admin-user.controller';
import { AdminUserService } from './admin-user/admin-user.service';
import { AdminUserSyncListener } from './admin-user/admin-user-sync.listener';
import { AdminUser } from './admin-user/entities/admin-user.entity';
import { AuthorizationRulesController } from './authorization-rules/authorization-rules.controller';
import { AuthorizationRulesService } from './authorization-rules/authorization-rules.service';
import { AuthorizationRule } from './authorization-rules/entities/authorization-rule.entity';
import { AuthorizationRuleHistory } from './authorization-rules/entities/authorization-rule-history.entity';
import { ReportingController } from './reporting/reporting.controller';
import { ReportingService } from './reporting/reporting.service';

@Module({
  imports: [
    InternalEventBusModule,
    TypeOrmModule.forFeature([AdminUser, AuthorizationRule, AuthorizationRuleHistory]),
  ],
  controllers: [
    AdminUserController,
    AuthorizationRulesController,
    ReportingController,
  ],
  providers: [
    AdminUserService,
    AdminUserSyncListener,
    AuthorizationRulesService,
    ReportingService,
  ],
  exports: [],
})
export class AdminModule {}
