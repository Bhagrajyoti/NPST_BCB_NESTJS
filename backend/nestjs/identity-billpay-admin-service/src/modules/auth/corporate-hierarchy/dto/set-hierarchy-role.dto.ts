import { IsNotEmpty, IsString } from 'class-validator';

export class SetHierarchyRoleDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  cif: string;

  @IsNotEmpty()
  @IsString()
  role: string;
}
