import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from '../database/entities/opportunity.entity';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
} from './dto/opportunity.dto';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
  ) {}

  async findAll(
    status?: string,
    type?: string,
    oemId?: string,
  ): Promise<Opportunity[]> {
    const query = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.mitigationPlans', 'mitigationPlans')
      .orderBy('opportunity.createdAt', 'DESC');

    if (status) {
      query.andWhere('opportunity.status = :status', { status });
    }

    if (type) {
      query.andWhere('opportunity.type = :type', { type });
    }

    if (oemId) {
      query.andWhere('opportunity.oemId = :oemId', { oemId });
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Opportunity> {
    return await this.opportunityRepository.findOne({
      where: { id },
      relations: ['mitigationPlans'],
    });
  }

  async create(
    createOpportunityDto: CreateOpportunityDto,
  ): Promise<Opportunity> {
    const opportunity = this.opportunityRepository.create(createOpportunityDto);
    return await this.opportunityRepository.save(opportunity);
  }

  async update(
    id: string,
    updateOpportunityDto: UpdateOpportunityDto,
  ): Promise<Opportunity> {
    await this.opportunityRepository.update(id, updateOpportunityDto);
    return await this.findOne(id);
  }

  async getStats() {
    const total = await this.opportunityRepository.count();
    const byStatus = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('opportunity.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('opportunity.status')
      .getRawMany();

    const byType = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('opportunity.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('opportunity.type')
      .getRawMany();

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }
}
