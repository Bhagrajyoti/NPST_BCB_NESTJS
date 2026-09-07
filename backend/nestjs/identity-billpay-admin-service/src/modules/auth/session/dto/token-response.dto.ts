import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUI...' })
  accessToken: string;

  @ApiProperty({ example: 300 })
  expiresIn: number;

  @ApiProperty({ example: 1800 })
  refreshExpiresIn: number;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUI...' })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 'openid profile email' })
  scope: string;
}
