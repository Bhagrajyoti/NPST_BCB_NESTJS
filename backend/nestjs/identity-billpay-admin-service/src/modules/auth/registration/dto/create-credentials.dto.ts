import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCredentialsDto {
  @IsNotEmpty()
  @IsString()
  attemptId: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
