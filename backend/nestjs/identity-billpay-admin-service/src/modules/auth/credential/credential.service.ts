import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from './entities/credential.entity';

@Injectable()
export class CredentialService {
  constructor(
    @InjectRepository(Credential)
    private readonly repository: Repository<Credential>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: string) {
    return this.repository.findOne({ where: { id } as any });
  }

  create(data: Partial<Credential>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
