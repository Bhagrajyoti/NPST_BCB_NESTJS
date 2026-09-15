import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../common/decorators/auth.decorator';
import { IdRequestDto } from '../../../common/dto/id-request.dto';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@ApiTags('Auth — Device')
@Auth()
@Controller('auth/device')
export class DeviceController {
  constructor(private readonly service: DeviceService) {}

  @Post('list')
  @ApiOperation({ summary: 'List all device profiles' })
  list() {
    return this.service.findAll();
  }

  @Post('get')
  @ApiOperation({ summary: 'Get device profile by ID' })
  get(@Body() dto: IdRequestDto) {
    return this.service.findOne(dto.id);
  }

  @Post('create')
  @ApiOperation({
    summary: 'Register a device',
    description: 'Links a mobile device to a user for trusted-device checks.',
  })
  create(@Body() dto: RegisterDeviceDto) {
    return this.service.create(dto);
  }

  @Post('delete')
  @ApiOperation({ summary: 'Soft-delete device profile' })
  delete(@Body() dto: IdRequestDto) {
    return this.service.softDelete(dto.id);
  }
}
