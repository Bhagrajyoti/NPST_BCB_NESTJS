import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'bank.maker.02' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: 'bank.maker.02@bank.example.com' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Ravi' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Sharma' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'BankMaker@123', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Local role UUID to assign', example: 'c12069f4-ad09-41e8-81e2-863c45728307' })
  @IsNotEmpty()
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ example: 'EMP-00042' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;
}

export class UpdateEmployeeRoleDto {
  @ApiProperty({
    description: 'Local employee UUID whose role should be updated',
    example: 'c12069f4-ad09-41e8-81e2-863c45728307',
  })
  @IsNotEmpty()
  @IsUUID()
  employeeId: string;

  @ApiProperty({
    description: 'New local role UUID to assign to the employee',
    example: 'd23070f5-be10-52f9-92f3-974d56839418',
  })
  @IsNotEmpty()
  @IsUUID()
  roleId: string;
}
