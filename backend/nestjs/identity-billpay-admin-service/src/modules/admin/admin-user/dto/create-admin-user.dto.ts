import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  email: string;
}
