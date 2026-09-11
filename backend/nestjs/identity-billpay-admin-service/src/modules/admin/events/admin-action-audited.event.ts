// The event name. Publisher and listener both import this constant, so a typo
// can never make them silently disagree.
export const ADMIN_ACTION_AUDITED_EVENT = 'admin.action.audited';

export class AdminActionAuditedEvent {
  constructor(
    public readonly adminUserId: string,
    public readonly action: string,
    public readonly targetId: string,
  ) {}
}
