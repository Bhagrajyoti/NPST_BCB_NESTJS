import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceProfile } from './entities/device-profile.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(DeviceProfile)
    private readonly repository: Repository<DeviceProfile>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Device profile not found');
    }
    return record;
  }

  create(dto: RegisterDeviceDto) {
    const entity = this.repository.create({
      userId: dto.userId,
      deviceId: dto.deviceId,
      deviceModel: dto.deviceModel,
      trusted: false,
    });
    return this.repository.save(entity);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
