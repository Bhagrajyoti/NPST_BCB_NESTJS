import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { addMinutes, isExpired } from '../../../common/utils/date.util';

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

@Injectable()
export class OtpService {
  private readonly maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10);
  private readonly lockMinutes = parseInt(process.env.OTP_LOCK_MINUTES ?? '15', 10);

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
    const otpHash = hashOtp(otp);
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

  /**
   * One-shot verification: expired/locked challenges are rejected, wrong codes count
   * toward OTP_MAX_ATTEMPTS (locking the challenge for OTP_LOCK_MINUTES once hit), and a
   * correct code soft-deletes the challenge so it can't be replayed.
   */
  async verify(dto: VerifyOtpDto): Promise<{ verified: true; mobileNumber: string }> {
    const challenge = await this.repository.findOne({ where: { id: dto.challengeId } });
    if (!challenge) {
      throw new NotFoundException('OTP challenge not found');
    }

    if (challenge.lockedUntil && !isExpired(challenge.lockedUntil)) {
      throw new ForbiddenException(
        `Too many failed attempts — locked until ${challenge.lockedUntil.toISOString()}`,
      );
    }

    if (isExpired(challenge.expiresAt)) {
      throw new BadRequestException('OTP has expired');
    }

    if (hashOtp(dto.otp) !== challenge.otpHash) {
      challenge.attemptCount += 1;
      if (challenge.attemptCount >= this.maxAttempts) {
        challenge.lockedUntil = addMinutes(new Date(), this.lockMinutes);
      }
      await this.repository.save(challenge);
      throw new BadRequestException('Invalid OTP');
    }

    // Correct code — one-time use, invalidate immediately.
    await this.repository.softDelete(challenge.id);
    return { verified: true, mobileNumber: challenge.mobileNumber };
  }

  async softDelete(id: string) {
    await this.findOne(id);
    await this.repository.softDelete(id);
    return { id, deleted: true };
  }
}
