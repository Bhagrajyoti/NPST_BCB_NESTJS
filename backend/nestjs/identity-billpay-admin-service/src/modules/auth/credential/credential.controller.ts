import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { CredentialService } from './credential.service';
import { SetCredentialDto } from './dto/set-credential.dto';

@ApiTags('Auth — Credential')
@Controller('auth/credential')
export class CredentialController {
  constructor(private readonly service: CredentialService) {}

  @Post('list')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all credentials', description: 'Returns all active credential records.' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credential by ID' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Post('create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set user credential',
    description: 'Stores a password credential for a user during registration or password reset.',
  })
  create(@Body() dto: SetCredentialDto) {
    return this.service.create(dto);
  }

  @Post('delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete credential', description: 'Marks credential as deleted without removing from DB.' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
