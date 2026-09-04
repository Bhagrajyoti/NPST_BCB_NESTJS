export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly mobileNumber: string,
  ) {}
}
