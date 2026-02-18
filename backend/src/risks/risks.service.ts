import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Risk } from '../database/entities/risk.entity';
import { CreateRiskDto, UpdateRiskDto } from './dto/risk.dto';

@Injectable()
export class RisksService {
  constructor(
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
  ) {}

  async findAll(status?: string, severity?: string): Promise<Risk[]> {
    const query = this.riskRepository
      .createQueryBuilder('risk')
      .leftJoinAndSelect('risk.mitigationPlans', 'mitigationPlans')
      .orderBy('risk.createdAt', 'DESC');

    if (status) {
      query.andWhere('risk.status = :status', { status });
    }

    if (severity) {
      query.andWhere('risk.severity = :severity', { severity });
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Risk> {
    return await this.riskRepository.findOne({
      where: { id },
      relations: ['mitigationPlans'],
    });
  }

  async create(createRiskDto: CreateRiskDto): Promise<Risk> {
    const risk = this.riskRepository.create(createRiskDto);
    return await this.riskRepository.save(risk);
  }

  async update(id: string, updateRiskDto: UpdateRiskDto): Promise<Risk> {
    await this.riskRepository.update(id, updateRiskDto);
    return await this.findOne(id);
  }

  async getStats() {
    const total = await this.riskRepository.count();
    const byStatus = await this.riskRepository
      .createQueryBuilder('risk')
      .select('risk.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('risk.status')
      .getRawMany();

    const bySeverity = await this.riskRepository
      .createQueryBuilder('risk')
      .select('risk.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('risk.severity')
      .getRawMany();

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }
}
