import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalEventBusService } from '../../../internal-events/internal-event-bus.service';
import {
  EMPLOYEE_ACCOUNT_SYNCED_EVENT,
  EmployeeAccountSyncedEvent,
} from '../../rbac/events/employee-account-synced.event';
import { AdminUser } from './entities/admin-user.entity';

// Only these roles represent an admin-portal account. Corporate/retail
// roles assigned through the same rbac flow are ignored here.
const ADMIN_PORTAL_ROLES = ['BANK_SUPER_ADMIN', 'BANK_ADMIN', 'BANK_MAKER', 'BANK_CHECKER'];

@Injectable()
export class AdminUserSyncListener implements OnModuleInit {
  private readonly logger = new Logger(AdminUserSyncListener.name);

  constructor(
    @InjectRepository(AdminUser)
    private readonly repository: Repository<AdminUser>,
    private readonly eventBus: InternalEventBusService,
  ) {}

  onModuleInit(): void {
    this.eventBus.on(EMPLOYEE_ACCOUNT_SYNCED_EVENT, (payload) => {
      this.handle(payload as EmployeeAccountSyncedEvent).catch((error) =>
        this.logger.error('Failed to sync admin_user read-model', error),
      );
    });
  }

  private async handle(event: EmployeeAccountSyncedEvent): Promise<void> {
    if (!ADMIN_PORTAL_ROLES.includes(event.roleName)) {
      return;
    }

    const existing = await this.repository.findOne({
      where: { keycloakUserId: event.keycloakUserId },
    });

    await this.repository.save(
      this.repository.create({
        ...existing,
        employeeId: event.employeeId,
        keycloakUserId: event.keycloakUserId,
        username: event.username,
        email: event.email,
        firstName: event.firstName,
        lastName: event.lastName,
        roleId: event.roleId,
        roleName: event.roleName,
        isActive: event.isActive,
        lastSyncedAt: new Date(),
      }),
    );
  }
}
