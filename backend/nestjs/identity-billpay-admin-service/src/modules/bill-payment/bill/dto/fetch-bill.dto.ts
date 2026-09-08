import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class FetchBillDto {
  @IsString()
  @IsNotEmpty()
  billerCode: string;

  @IsString()
  @Matches(/^\d{12}$/, {
    message: 'Consumer number must be exactly 12 digits',
  })
  consumerNumber: string;

  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'Registered mobile must be exactly 10 digits',
  })
  registeredMobile: string;
}

