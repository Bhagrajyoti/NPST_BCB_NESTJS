import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { BankAccountService } from './bank-account.service';

@ApiTags('Customers (mock CBS data)')
@Controller('customer')
export class BankAccountController {
  constructor(private readonly service: BankAccountService) {}

  @Public()
  @Post('list')
  @ApiOperation({
    summary: 'List all customers',
    description:
      'Public — no Bearer token, no request body, no filters. Returns every mock ' +
      'customer/bank-account record on file directly (mobile number, account holder name, ' +
      'account/IFSC/debit-card details — CVV never included). Mock CBS data only, same rows as ' +
      'POST /auth/registration/create\'s registeredAccounts — see mock-testing-guide.md.',
  })
  @ApiResponse({ status: 201, description: 'List of customers' })
  list() {
    return this.service.findAll();
  }
}
