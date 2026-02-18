import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { RisksService } from './risks.service';
import { CreateRiskDto, UpdateRiskDto } from './dto/risk.dto';

@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
  ) {
    return await this.risksService.findAll(status, severity);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.risksService.findOne(id);
  }

  @Post()
  async create(@Body() createRiskDto: CreateRiskDto) {
    return await this.risksService.create(createRiskDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateRiskDto: UpdateRiskDto) {
    return await this.risksService.update(id, updateRiskDto);
  }

  @Get('stats/summary')
  async getStats() {
    return await this.risksService.getStats();
  }
}
