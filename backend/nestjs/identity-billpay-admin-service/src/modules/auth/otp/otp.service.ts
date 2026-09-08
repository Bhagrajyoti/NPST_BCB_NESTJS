import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { GenerateOtpDto } from './dto/generate-otp.dto';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpChallenge)
    private readonly repository: Repository<OtpChallenge>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  async findOne(id: string) {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('OTP challenge not found');
    }
    return record;
  }

  async create(dto: GenerateOtpDto) {
    const otp = String(randomInt(100000, 999999));
    const otpHash = createHash('sha256').update(otp).digest('hex');
    const ttlSeconds = parseInt(process.env.OTP_TTL_SECONDS ?? '300', 10);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const entity = this.repository.create({
      mobileNumber: dto.mobileNumber,
      otpHash,
      attemptCount: 0,
      expiresAt,
    });
    const saved = await this.repository.save(entity);
    return { ...saved, otp };
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
