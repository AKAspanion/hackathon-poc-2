import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { MitigationPlansService } from './mitigation-plans.service';
import {
  CreateMitigationPlanDto,
  UpdateMitigationPlanDto,
} from './dto/mitigation-plan.dto';

@Controller('mitigation-plans')
export class MitigationPlansController {
  constructor(
    private readonly mitigationPlansService: MitigationPlansService,
  ) {}

  @Get()
  async findAll(
    @Query('riskId') riskId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('status') status?: string,
  ) {
    return await this.mitigationPlansService.findAll(
      riskId,
      opportunityId,
      status,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.mitigationPlansService.findOne(id);
  }

  @Post()
  async create(@Body() createMitigationPlanDto: CreateMitigationPlanDto) {
    return await this.mitigationPlansService.create(createMitigationPlanDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMitigationPlanDto: UpdateMitigationPlanDto,
  ) {
    return await this.mitigationPlansService.update(
      id,
      updateMitigationPlanDto,
    );
  }
}
