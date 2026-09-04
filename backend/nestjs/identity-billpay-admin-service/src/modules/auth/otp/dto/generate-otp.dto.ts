import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateOtpDto {
  @IsNotEmpty()
  @IsString()
  mobileNumber: string;
}
