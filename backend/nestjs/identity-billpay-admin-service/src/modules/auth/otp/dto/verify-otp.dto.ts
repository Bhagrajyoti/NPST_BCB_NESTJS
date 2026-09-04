import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  challengeId: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}
