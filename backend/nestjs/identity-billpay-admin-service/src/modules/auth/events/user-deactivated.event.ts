// The event name. Publisher and listener both import this constant, so a typo
// can never make them silently disagree.
export const USER_DEACTIVATED_EVENT = 'auth.user.deactivated';

export class UserDeactivatedEvent {
  constructor(
    public readonly userId: string,
    public readonly reason: string,
  ) {}
}
