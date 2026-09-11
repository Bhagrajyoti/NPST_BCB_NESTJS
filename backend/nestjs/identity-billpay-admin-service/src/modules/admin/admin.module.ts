import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalEventBusModule } from '../../internal-events/internal-event-bus.module';
import { AuditOutboxModule } from '../../clients/audit-outbox/audit-outbox.module';
import { AdminActionAuditListener } from './admin-action-audit.listener';
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
// TEMPORARY — remove these two imports and their entries below before production.
import { EventListController } from './event-list/event-list.controller';
import { EventListService } from './event-list/event-list.service';

@Module({
  imports: [
    InternalEventBusModule,
    AuditOutboxModule,
    TypeOrmModule.forFeature([AdminUser, AuthorizationRule, AuthorizationRuleHistory]),
  ],
  controllers: [
    AdminUserController,
    AuthorizationRulesController,
    ReportingController,
    EventListController, // TEMPORARY
  ],
  providers: [
    AdminUserService,
    AdminUserSyncListener,
    AdminActionAuditListener,
    AuthorizationRulesService,
    ReportingService,
    EventListService, // TEMPORARY
  ],
  exports: [],
})
export class AdminModule {}
