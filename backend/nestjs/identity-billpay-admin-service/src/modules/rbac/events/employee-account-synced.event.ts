export const EMPLOYEE_ACCOUNT_SYNCED_EVENT = 'rbac.employee-account.synced';

export class EmployeeAccountSyncedEvent {
  constructor(
    public readonly employeeId: string,
    public readonly keycloakUserId: string,
    public readonly username: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly roleId: string,
    public readonly roleName: string,
    public readonly isActive: boolean,
  ) {}
}
