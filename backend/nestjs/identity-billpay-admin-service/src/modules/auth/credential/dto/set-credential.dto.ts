import { IsNotEmpty, IsString } from 'class-validator';

export class SetCredentialDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
