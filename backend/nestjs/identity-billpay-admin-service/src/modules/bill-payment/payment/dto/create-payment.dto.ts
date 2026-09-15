import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description:
      'Bill number from `POST /bill-payment/bill/fetch` (preferred for Pay now after fetch).',
    example: 'BBPS-GAS-001',
  })
  @ValidateIf((dto) => !dto.billerCode && !dto.consumerNumber)
  @IsNotEmpty()
  @IsString()
  billNumber?: string;

  @ApiPropertyOptional({ description: 'Legacy/alternate pay path when billNumber is omitted.' })
  @ValidateIf((dto) => !dto.billNumber)
  @IsNotEmpty()
  @IsString()
  billerCode?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto) => !dto.billNumber)
  @IsNotEmpty()
  @IsString()
  consumerNumber?: string;

  @ApiPropertyOptional({
    description: 'Required when paying by billerCode+consumerNumber; optional when paying by billNumber.',
    example: '900.00',
  })
  @ValidateIf((dto) => !dto.billNumber)
  @IsNotEmpty()
  @IsString()
  amount?: string;

  @ApiPropertyOptional({
    description:
      'Deprecated — prefer the `Idempotency-Key` request header. Still accepted when the header is omitted.',
    example: 'pay-unique-key-001',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;
}
