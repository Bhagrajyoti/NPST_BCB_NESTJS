// The event name. Publisher and listener both import this constant, so a typo
// can never make them silently disagree.
export const BILL_PAYMENT_COMPLETED_EVENT = 'bill-payment.completed';

export class BillPaymentCompletedEvent {
  constructor(
    public readonly billPaymentId: string,
    public readonly status: string,
  ) {}
}
