import { ApiProperty } from '@nestjs/swagger';
import { TokenResponseDto } from './token-response.dto';

/** Matches the global ResponseTransformInterceptor wrapper around login tokens. */
export class TokenLoginResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({
    type: TokenResponseDto,
    description:
      'Copy **data.accessToken** (JWT with two dots) into Swagger Authorize — not refreshToken.',
  })
  data: TokenResponseDto;
}
