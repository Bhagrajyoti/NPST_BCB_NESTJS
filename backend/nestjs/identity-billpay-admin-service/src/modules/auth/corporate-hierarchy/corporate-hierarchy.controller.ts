import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { CorporateHierarchyService } from './corporate-hierarchy.service';
import { SetHierarchyRoleDto } from './dto/set-hierarchy-role.dto';

@ApiTags('Auth — Corporate Hierarchy')
@Controller('auth/corporate-hierarchy')
export class CorporateHierarchyController {
  constructor(private readonly service: CorporateHierarchyService) {}

  @Post('list')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List corporate hierarchy records' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get hierarchy record by ID' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Post('create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign corporate role',
    description:
      'Links a user to a CIF with a realm role (e.g. CORPORATE_MAKER, CORPORATE_CHECKER).',
  })
  create(@Body() dto: SetHierarchyRoleDto) {
    return this.service.create(dto);
  }

  @Post('delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete hierarchy record' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
