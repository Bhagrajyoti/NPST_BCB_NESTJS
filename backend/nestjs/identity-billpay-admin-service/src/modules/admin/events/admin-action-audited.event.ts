export class AdminActionAuditedEvent {
  constructor(
    public readonly adminUserId: string,
    public readonly action: string,
    public readonly targetId: string,
  ) {}
}
