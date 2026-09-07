import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@ApiTags('Auth — Device')
@Controller('auth/device')
export class DeviceController {
  constructor(private readonly service: DeviceService) {}

  @Post('list')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all device profiles' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get device profile by ID' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Post('create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a device',
    description: 'Links a mobile device to a user for trusted-device checks.',
  })
  create(@Body() dto: RegisterDeviceDto) {
    return this.service.create(dto);
  }

  @Post('delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete device profile' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
