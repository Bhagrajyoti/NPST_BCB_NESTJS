import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { REGEX } from '../../../../common/constants/regex.constant';

export class ActivateMobileDto {
  @ApiProperty({ description: 'Mobile number to activate', example: '9876543210' })
  @IsNotEmpty()
  @IsString()
  @Matches(REGEX.MOBILE_NUMBER, { message: 'Must be a valid 10-digit Indian mobile number' })
  mobileNumber: string;

  @ApiProperty({
    description: 'Account number, as returned in registeredAccounts by POST /auth/registration/create',
    example: '10023456789012',
  })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Debit card number printed on the card', example: '4111111111111111' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{12,19}$/, { message: 'Debit card number must be 12-19 digits' })
  debitCardNumber: string;

  @ApiProperty({ description: 'Debit card expiry, as printed on the card', example: '09/28' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Expiry must be in MM/YY format' })
  debitCardExpiry: string;

  @ApiProperty({ description: 'Debit card CVV', example: '123' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3-4 digits' })
  debitCardCvv: string;
}
