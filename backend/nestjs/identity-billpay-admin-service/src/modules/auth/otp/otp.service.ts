import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpChallenge } from './entities/otp-challenge.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpChallenge)
    private readonly repository: Repository<OtpChallenge>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<OtpChallenge>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
