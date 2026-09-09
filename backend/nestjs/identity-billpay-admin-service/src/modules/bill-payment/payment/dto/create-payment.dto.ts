import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  billerCode: string;

  @IsNotEmpty()
  @IsString()
  consumerNumber: string;

  @IsNotEmpty()
  @IsString()
  amount: string;

  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;
}