import { IsNotEmpty, IsString } from 'class-validator';

export class LinkCifDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  cif: string;
}
