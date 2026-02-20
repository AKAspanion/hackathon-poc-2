import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Oem } from '../database/entities/oem.entity';
import { RegisterOemDto } from './dto/register-oem.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class OemsService {
  constructor(
    @InjectRepository(Oem)
    private oemRepository: Repository<Oem>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterOemDto): Promise<{ oem: Oem; token: string }> {
    const existing = await this.oemRepository.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    if (existing) {
      throw new ConflictException('An OEM with this email is already registered.');
    }
    const oem = this.oemRepository.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
    });
    await this.oemRepository.save(oem);
    const token = this.createToken(oem);
    return { oem, token };
  }

  async login(email: string): Promise<{ oem: Oem; token: string }> {
    const normalized = email.trim().toLowerCase();
    let oem = await this.oemRepository.findOne({ where: { email: normalized } });
    if (!oem) {
      oem = this.oemRepository.create({ name: normalized.split('@')[0], email: normalized });
      await this.oemRepository.save(oem);
    }
    const token = this.createToken(oem);
    return { oem, token };
  }

  async findById(id: string): Promise<Oem | null> {
    return this.oemRepository.findOne({ where: { id } });
  }

  private createToken(oem: Oem): string {
    const payload: JwtPayload = { sub: oem.id, email: oem.email };
    return this.jwtService.sign(payload);
  }
}
