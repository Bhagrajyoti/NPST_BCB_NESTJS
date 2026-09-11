import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extractRealmRoles, isSuperadmin } from '../../rbac/constants/rbac.constants';
import { CreateAuthorizationRuleDto } from './dto/create-authorization-rule.dto';
import { UpdateAuthorizationRuleDto } from './dto/update-authorization-rule.dto';
import { AuthorizationRuleHistory } from './entities/authorization-rule-history.entity';
import { AuthorizationRule } from './entities/authorization-rule.entity';
import { InternalEventBusService } from '../../../internal-events/internal-event-bus.service';
import {
  ADMIN_ACTION_AUDITED_EVENT,
  AdminActionAuditedEvent,
} from '../events/admin-action-audited.event';


const VIEW_ROLES = ['BANK_SUPER_ADMIN', 'BANK_ADMIN'];

@Injectable()
export class AuthorizationRulesService {
  constructor(
    @InjectRepository(AuthorizationRule)
    private readonly rules: Repository<AuthorizationRule>,
    @InjectRepository(AuthorizationRuleHistory)
    private readonly history: Repository<AuthorizationRuleHistory>,
    private readonly eventBus: InternalEventBusService,

  ) {}

  findAll(actor: Record<string, unknown>) {
    this.assertCanView(actor);
    return this.rules.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, actor: Record<string, unknown>) {
    this.assertCanView(actor);
    const rule = await this.rules.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Authorization rule not found');
    }
    return rule;
  }

  async findHistory(id: string, actor: Record<string, unknown>) {
    this.assertCanView(actor);
    await this.findOne(id, actor);
    return this.history.find({ where: { ruleId: id }, order: { version: 'DESC' } });
  }

  async create(dto: CreateAuthorizationRuleDto, actor: Record<string, unknown>) {
    this.assertIsSuperAdmin(actor);
    const actorKeycloakUserId = actor.sub as string;

    const rule = await this.rules.save(
      this.rules.create({
        ruleName: dto.ruleName,
        cif: dto.cif,
        threshold: dto.threshold,
        version: 1,
        createdByKeycloakUserId: actorKeycloakUserId,
      }),
    );

    await this.history.save(
      this.history.create({
        ruleId: rule.id,
        snapshot: { ruleName: rule.ruleName, cif: rule.cif, threshold: rule.threshold },
        version: rule.version,
        changedByKeycloakUserId: actorKeycloakUserId,
      }),
    );
      this.eventBus.publish(
      ADMIN_ACTION_AUDITED_EVENT,
      new AdminActionAuditedEvent(actorKeycloakUserId, 'AUTHORIZATION_RULE_CREATED', rule.id),
    );

    return rule;
  }

  async update(dto: UpdateAuthorizationRuleDto, actor: Record<string, unknown>) {
    this.assertIsSuperAdmin(actor);
    const actorKeycloakUserId = actor.sub as string;

    const rule = await this.rules.findOne({ where: { id: dto.id } });
    if (!rule) {
      throw new NotFoundException('Authorization rule not found');
    }

    if (dto.ruleName !== undefined) rule.ruleName = dto.ruleName;
    if (dto.threshold !== undefined) rule.threshold = dto.threshold;
    rule.version += 1;
    rule.updatedByKeycloakUserId = actorKeycloakUserId;

    await this.rules.save(rule);

    await this.history.save(
      this.history.create({
        ruleId: rule.id,
        snapshot: {
          ruleName: rule.ruleName,
          cif: rule.cif,
          threshold: rule.threshold,
          changeReason: dto.changeReason ?? null,
        },
        version: rule.version,
        changedByKeycloakUserId: actorKeycloakUserId,
      }),
    );
        this.eventBus.publish(
      ADMIN_ACTION_AUDITED_EVENT,
      new AdminActionAuditedEvent(actorKeycloakUserId, 'AUTHORIZATION_RULE_UPDATED', rule.id),
    );


    return rule;
  }

  async deactivate(id: string, actor: Record<string, unknown>) {
    this.assertIsSuperAdmin(actor);
    const actorKeycloakUserId = actor.sub as string;

    const rule = await this.rules.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Authorization rule not found');
    }

    await this.history.save(
      this.history.create({
        ruleId: rule.id,
        snapshot: { ruleName: rule.ruleName, cif: rule.cif, threshold: rule.threshold, deactivated: true },
        version: rule.version + 1,
        changedByKeycloakUserId: actorKeycloakUserId,
      }),
    );

    await this.rules.softDelete(id);
        this.eventBus.publish(
      ADMIN_ACTION_AUDITED_EVENT,
      new AdminActionAuditedEvent(actorKeycloakUserId, 'AUTHORIZATION_RULE_DEACTIVATED', id),
    );

    return { id, deactivated: true };
  }

  private assertCanView(actor: Record<string, unknown>): void {
    const roles = extractRealmRoles(actor);
    if (!roles.some((role) => VIEW_ROLES.includes(role))) {
      throw new ForbiddenException('Only bank admin or bank super admin users can view authorization rules');
    }
  }

  private assertIsSuperAdmin(actor: Record<string, unknown>): void {
    if (!isSuperadmin(actor)) {
      throw new ForbiddenException('Only bank super admin users can configure authorization rules');
    }
  }
}
