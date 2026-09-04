import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserController } from './admin-user/admin-user.controller';
import { AdminUserService } from './admin-user/admin-user.service';
import { AdminUser } from './admin-user/entities/admin-user.entity';
import { CifLinkingController } from './cif-linking/cif-linking.controller';
import { CifLinkingService } from './cif-linking/cif-linking.service';
import { CifLink } from './cif-linking/entities/cif-link.entity';
import { AuthorizationRulesController } from './authorization-rules/authorization-rules.controller';
import { AuthorizationRulesService } from './authorization-rules/authorization-rules.service';
import { AuthorizationRule } from './authorization-rules/entities/authorization-rule.entity';
import { AuthorizationRuleHistory } from './authorization-rules/entities/authorization-rule-history.entity';
import { ReportingController } from './reporting/reporting.controller';
import { ReportingService } from './reporting/reporting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, CifLink, AuthorizationRule, AuthorizationRuleHistory]),
  ],
  controllers: [
    AdminUserController,
    CifLinkingController,
    AuthorizationRulesController,
    ReportingController,
  ],
  providers: [AdminUserService, CifLinkingService, AuthorizationRulesService, ReportingService],
  exports: [],
})
export class AdminModule {}
