import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({
    description: 'Use this value in Swagger Authorize. RS256 JWT (3 dot-separated parts).',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUI...',
  })
  accessToken: string;

  @ApiProperty({ example: 300, description: 'Access token lifetime in seconds' })
  expiresIn: number;

  @ApiProperty({ example: 1800 })
  refreshExpiresIn: number;

  @ApiProperty({
    description: 'For logout only. Do NOT use this in Authorize for API calls.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUI...',
  })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 'openid profile email' })
  scope: string;
}
