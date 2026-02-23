import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MitigationPlan } from '../database/entities/mitigation-plan.entity';
import {
  CreateMitigationPlanDto,
  UpdateMitigationPlanDto,
} from './dto/mitigation-plan.dto';

@Injectable()
export class MitigationPlansService {
  constructor(
    @InjectRepository(MitigationPlan)
    private mitigationPlanRepository: Repository<MitigationPlan>,
  ) {}

  async findAll(
    riskId?: string,
    opportunityId?: string,
    status?: string,
  ): Promise<MitigationPlan[]> {
    const query = this.mitigationPlanRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.risk', 'risk')
      .leftJoinAndSelect('plan.opportunity', 'opportunity')
      .orderBy('plan.createdAt', 'DESC');

    if (riskId) {
      query.andWhere('plan.riskId = :riskId', { riskId });
    }

    if (opportunityId) {
      query.andWhere('plan.opportunityId = :opportunityId', { opportunityId });
    }

    if (status) {
      query.andWhere('plan.status = :status', { status });
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<MitigationPlan> {
    return await this.mitigationPlanRepository.findOne({
      where: { id },
      relations: ['risk', 'opportunity'],
    });
  }

  async create(
    createMitigationPlanDto: CreateMitigationPlanDto,
  ): Promise<MitigationPlan> {
    const plan = this.mitigationPlanRepository.create(createMitigationPlanDto);
    return await this.mitigationPlanRepository.save(plan);
  }

  async update(
    id: string,
    updateMitigationPlanDto: UpdateMitigationPlanDto,
  ): Promise<MitigationPlan> {
    await this.mitigationPlanRepository.update(id, updateMitigationPlanDto);
    return await this.findOne(id);
  }
}
