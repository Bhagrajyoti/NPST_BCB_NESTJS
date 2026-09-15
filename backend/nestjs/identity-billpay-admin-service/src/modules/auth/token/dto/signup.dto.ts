import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({
    description: 'Login username — this is exactly what you pass as `username` to POST /auth/login afterwards',
    example: 'jane.doe',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty({ description: 'Login password (min 8 chars)', example: 'MySecurePass@123', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    description: 'Defaults to "<username>@signup.bharat-banking.local" if omitted',
    example: 'jane.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Defaults to the username if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Defaults to the username if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
