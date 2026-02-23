import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
} from './dto/opportunity.dto';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('oemId') oemId?: string,
  ) {
    return await this.opportunitiesService.findAll(status, type, oemId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.opportunitiesService.findOne(id);
  }

  @Post()
  async create(@Body() createOpportunityDto: CreateOpportunityDto) {
    return await this.opportunitiesService.create(createOpportunityDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOpportunityDto: UpdateOpportunityDto,
  ) {
    return await this.opportunitiesService.update(id, updateOpportunityDto);
  }

  @Get('stats/summary')
  async getStats() {
    return await this.opportunitiesService.getStats();
  }
}
