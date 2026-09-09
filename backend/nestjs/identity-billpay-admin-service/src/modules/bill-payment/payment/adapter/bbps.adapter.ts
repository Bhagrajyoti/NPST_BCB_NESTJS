export interface BbpsPaymentRequest {
  billerCode: string;
  consumerNumber: string;
  amount: number;
}

export interface BbpsPaymentResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'TIMEOUT';
  referenceId?: string;
}

export interface BbpsAdapter {
  pay(request: BbpsPaymentRequest): Promise<BbpsPaymentResponse>;
}
