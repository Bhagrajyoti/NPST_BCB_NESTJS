import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeycloakService } from '../keycloak/keycloak.service';
import { GetCredentialDto } from './dto/get-credential.dto';
import { SetCredentialDto } from './dto/set-credential.dto';
import { Credential } from './entities/credential.entity';
import { hashMpin, verifyMpin } from './utils/mpin-hash.util';

@Injectable()
export class CredentialService {
  constructor(
    @InjectRepository(Credential)
    private readonly repository: Repository<Credential>,
    private readonly keycloakService: KeycloakService,
  ) {}

  findAll() {
    return this.repository.find().then((records) => records.map((record) => this.toPublicView(record)));
  }

  async findByKeycloakUserId(keycloakUserId: string) {
    const record = await this.repository.findOne({ where: { keycloakUserId } });
    if (!record) {
      throw new NotFoundException(
        `No MPIN credential found for Keycloak user ${keycloakUserId}. ` +
          'Login passwords are managed by Keycloak only — create an MPIN via POST /auth/credential/create.',
      );
    }
    return this.toPublicView(record);
  }

  async resolveGet(dto: GetCredentialDto, actorSub?: string) {
    const keycloakUserId = dto.userId ?? actorSub;
    if (!keycloakUserId) {
      throw new BadRequestException(
        'userId is required when no authenticated user is present in the Bearer token',
      );
    }
    return this.findByKeycloakUserId(keycloakUserId);
  }

  async create(dto: SetCredentialDto) {
    if (!dto.password && !dto.mpin) {
      throw new BadRequestException('Provide either password (Keycloak) or mpin (local storage)');
    }

    let passwordUpdated = false;
    let mpinRecord: Credential | null = null;

    if (dto.password) {
      await this.keycloakService.resetUserPassword(dto.userId, dto.password);
      passwordUpdated = true;
    }

    if (dto.mpin) {
      const existing = await this.repository.findOne({ where: { keycloakUserId: dto.userId } });
      if (existing) {
        existing.hashedMpin = hashMpin(dto.mpin);
        existing.lastRotatedAt = new Date();
        mpinRecord = await this.repository.save(existing);
      } else {
        mpinRecord = await this.repository.save(
          this.repository.create({
            keycloakUserId: dto.userId,
            hashedMpin: hashMpin(dto.mpin),
            lastRotatedAt: new Date(),
          }),
        );
      }
    }

    return {
      keycloakUserId: dto.userId,
      passwordUpdated,
      mpin: mpinRecord ? this.toPublicView(mpinRecord) : null,
    };
  }

  /**
   * Compares a plaintext MPIN against the stored scrypt hash for a customer — the
   * counterpart to `create()`'s hashing, for use by an MPIN-based login/step-up-auth flow.
   * Never logs or returns the plaintext or hash.
   */
  async verifyMpin(keycloakUserId: string, mpin: string): Promise<boolean> {
    const record = await this.repository.findOne({ where: { keycloakUserId } });
    if (!record) {
      return false;
    }
    return verifyMpin(mpin, record.hashedMpin);
  }

  async softDeleteByKeycloakUserId(keycloakUserId: string) {
    const record = await this.repository.findOne({ where: { keycloakUserId } });
    if (!record) {
      throw new NotFoundException(`No MPIN credential found for Keycloak user ${keycloakUserId}`);
    }
    await this.repository.softDelete(record.id);
    return { keycloakUserId, deleted: true };
  }

  private toPublicView(record: Credential) {
    return {
      id: record.id,
      keycloakUserId: record.keycloakUserId,
      hasMpin: true,
      lastRotatedAt: record.lastRotatedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
