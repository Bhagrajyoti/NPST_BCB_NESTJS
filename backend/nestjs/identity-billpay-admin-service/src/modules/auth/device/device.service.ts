import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceProfile } from './entities/device-profile.entity';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(DeviceProfile)
    private readonly repository: Repository<DeviceProfile>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<DeviceProfile>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
