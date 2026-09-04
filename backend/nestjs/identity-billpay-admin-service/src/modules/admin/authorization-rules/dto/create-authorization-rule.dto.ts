import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAuthorizationRuleDto {
  @IsNotEmpty()
  @IsString()
  ruleName: string;

  @IsNotEmpty()
  @IsString()
  cif: string;

  @IsNotEmpty()
  @IsString()
  threshold: string;
}
