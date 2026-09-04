export class BillPaymentCompletedEvent {
  constructor(
    public readonly billPaymentId: string,
    public readonly status: string,
  ) {}
}
