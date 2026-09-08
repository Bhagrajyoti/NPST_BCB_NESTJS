import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class IdRequestDto {
  @ApiProperty({
    description: 'Internal record UUID returned from a list/create response',
  })
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
