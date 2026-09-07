import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationAttempt } from './entities/registration-attempt.entity';
import { InitRegistrationDto } from './dto/init-registration.dto';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(RegistrationAttempt)
    private readonly repository: Repository<RegistrationAttempt>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Registration attempt not found');
    }
    return record;
  }

  create(dto: InitRegistrationDto) {
    const entity = this.repository.create({
      mobileNumber: dto.mobileNumber,
      panOrCif: dto.panOrCif,
      currentStep: 'INIT',
    });
    return this.repository.save(entity);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
