// The event name. Publisher and listener both import this constant, so a typo
// can never make them silently disagree.
export const USER_REGISTERED_EVENT = 'auth.user.registered';

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly mobileNumber: string,
  ) {}
}
