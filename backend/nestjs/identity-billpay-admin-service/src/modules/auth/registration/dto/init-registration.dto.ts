import { IsNotEmpty, IsString } from 'class-validator';

export class InitRegistrationDto {
  @IsNotEmpty()
  @IsString()
  mobileNumber: string;

  @IsNotEmpty()
  @IsString()
  panOrCif: string;
}
