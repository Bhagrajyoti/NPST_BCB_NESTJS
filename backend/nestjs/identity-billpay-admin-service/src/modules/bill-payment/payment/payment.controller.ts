import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';

import { Auth } from '../../../common/decorators/auth.decorator';
import { IdempotencyKey } from '../../../common/decorators/idempotency-key.decorator';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import {
  BBPS_PAYMENT_BANK_READ_ROLES,
  BBPS_PAYMENT_CREATE_ROLES,
  BBPS_PAYMENT_READ_CUSTOMER_ROLES,
  BBPS_PAYMENT_RETRY_ROLES,
} from '../../rbac/constants/rbac.constants';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Bill Payment — Payment')
@Controller('bill-payment/payment')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Get()
  @Auth(...BBPS_PAYMENT_READ_CUSTOMER_ROLES, ...BBPS_PAYMENT_BANK_READ_ROLES)
  @ApiOperation({
    summary: 'List payments',
    description:
      'Customers see only their own payments (JWT sub). BANK_SUPER_ADMIN and BANK_ADMIN see all.',
  })
  findAll(@AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findAll(actor);
  }

  @Get(':id')
  @Auth(...BBPS_PAYMENT_READ_CUSTOMER_ROLES, ...BBPS_PAYMENT_BANK_READ_ROLES)
  @ApiOperation({ summary: 'Get payment by id' })
  findOne(@Param('id') id: string, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.findOne(id, actor);
  }

  @Post()
  @Auth(...BBPS_PAYMENT_CREATE_ROLES)
  @IdempotencyKey()
  @ApiOperation({
    summary: 'Pay a bill',
    description:
      'RETAIL_CUSTOMER, CORPORATE_IT_ADMIN, or CORPORATE_MAKER. Requires Idempotency-Key header.',
  })
  create(@Body() dto: CreatePaymentDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    return this.service.create(dto, actor);
  }

  @Post('retry')
  @Auth(...BBPS_PAYMENT_RETRY_ROLES)
  @ApiOperation({
    summary: 'Retry a non-final payment via BBPS',
    description:
      'Re-dispatches a PENDING/TIMEOUT/FAILED payment. Caller must own the payment (JWT sub).',
  })
  async retry(@Body() dto: IdRequestDto, @AuthenticatedUser() actor: Record<string, unknown>) {
    await this.service.payViaBbps(dto.id, actor);
    return this.service.findOne(dto.id, actor);
  }
}
