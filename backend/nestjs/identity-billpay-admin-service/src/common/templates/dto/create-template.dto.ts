import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsNotEmpty()
  @IsString()
  key: string;

  @IsNotEmpty()
  @IsString()
  channel: string;

  @IsNotEmpty()
  @IsString()
  body: string;
}
