import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class IdRequestDto {
  @ApiProperty({
    description: 'UUID of the record',
    example: 'c12069f4-ad09-41e8-81e2-863c45728307',
  })
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
