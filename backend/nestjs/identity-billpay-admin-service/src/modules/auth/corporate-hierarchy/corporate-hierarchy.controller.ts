import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../common/decorators/auth.decorator';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { CorporateHierarchyService } from './corporate-hierarchy.service';
import { SetHierarchyRoleDto } from './dto/set-hierarchy-role.dto';

@ApiTags('Auth — Corporate Hierarchy')
@Auth()
@Controller('auth/corporate-hierarchy')
export class CorporateHierarchyController {
  constructor(private readonly service: CorporateHierarchyService) {}

  @Post('list')
  @ApiOperation({ summary: 'List corporate hierarchy records' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @ApiOperation({ summary: 'Get hierarchy record by ID' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Post('create')
  @ApiOperation({
    summary: 'Assign corporate role',
    description:
      'Links a user to a CIF with a realm role (e.g. CORPORATE_MAKER, CORPORATE_CHECKER).',
  })
  create(@Body() dto: SetHierarchyRoleDto) {
    return this.service.create(dto);
  }

  @Post('delete')
  @ApiOperation({ summary: 'Soft-delete hierarchy record' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
