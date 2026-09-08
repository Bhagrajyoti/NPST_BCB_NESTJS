import { Injectable } from '@nestjs/common';

import {
  BbpsAdapter,
  BbpsPaymentRequest,
  BbpsPaymentResponse,
} from './bbps.adapter';

@Injectable()
export class MockBbpsAdapter implements BbpsAdapter {
  async pay(
    _request: BbpsPaymentRequest,
  ): Promise<BbpsPaymentResponse> {
    const randomNumber = Math.floor(Math.random() * 20);

    if (randomNumber <= 4) {
      return {
        status: 'SUCCESS',
        referenceId: `BBPS-${Date.now()}`,
      };
    }

    if (randomNumber <= 9) {
      return {
        status: 'FAILED',
        referenceId: `BBPS-${Date.now()}`,
      };
    }

    if (randomNumber <= 14) {
      return {
        status: 'PENDING',
        referenceId: `BBPS-${Date.now()}`,
      };
    }

    return {
      status: 'TIMEOUT',
    };
  }
}
