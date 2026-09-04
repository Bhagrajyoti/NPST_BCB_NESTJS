import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBillerDto {
  @IsNotEmpty()
  @IsString()
  billerCode: string;

  @IsNotEmpty()
  @IsString()
  billerName: string;

  @IsNotEmpty()
  @IsString()
  category: string;
}
