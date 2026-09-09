import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GetCredentialDto {
  @ApiPropertyOptional({
    description:
      'Customer Keycloak user ID (`sub` from session/me). Omit to use the logged-in mobile app user.',
    example: '334b032c-7468-47fa-82a3-8204b80913a2',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
