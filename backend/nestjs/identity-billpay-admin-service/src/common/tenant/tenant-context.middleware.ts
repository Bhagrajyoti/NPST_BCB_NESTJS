import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { BankConfigService } from './bank-config.service';

export interface TenantRequest extends Request {
  tenantContext?: ReturnType<BankConfigService['getConfig']>;
}

// Resolves which bank/tenant this request belongs to (from an `x-bank-id` header, falling
// back to the single configured bank — see BankConfigService) and attaches it to the request
// for downstream handlers. Applied to every route (see app.module.ts's `configure()`).
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly bankConfigService: BankConfigService) {}

  use(req: TenantRequest, _res: Response, next: NextFunction): void {
    const bankId = (req.headers['x-bank-id'] as string | undefined) ?? undefined;
    req.tenantContext = this.bankConfigService.getConfig(bankId);
    next();
  }
}
