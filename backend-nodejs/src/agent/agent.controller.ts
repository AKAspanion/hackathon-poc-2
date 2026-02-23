import { Controller, Get, Logger, Post, Body, Query } from '@nestjs/common';
import { AgentService } from './agent.service';
import { CurrentOem } from '../oems/oem.decorator';
import { Oem } from '../database/entities/oem.entity';

@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  @Get('status')
  async getStatus() {
    this.logger.log('GET /agent/status - Fetching agent status');
    const status = await this.agentService.getStatus();
    this.logger.log('GET /agent/status - Status retrieved');
    return status;
  }

  @Get('risk-score')
  async getRiskScore(
    @CurrentOem() oem: Oem,
    @Query('oemId') oemId?: string,
  ) {
    const id = oemId ?? oem.id;
    const score = await this.agentService.getLatestRiskScore(id);
    return score ?? { message: 'No risk score computed yet for this OEM.' };
  }

  /**
   * Trigger analysis for the current OEM (from JWT). Uses that OEM's suppliers,
   * locations, and commodities to fetch and analyze data. Optional body.oemId
   * can be used to trigger for a specific OEM (e.g. admin).
   */
  @Post('trigger')
  async triggerAnalysis(
    @CurrentOem() oem: Oem,
    @Body() body?: { oemId?: string },
  ) {
    const oemId = body?.oemId ?? oem.id;
    this.logger.log(
      `POST /agent/trigger - Analysis trigger requested for OEM ${oemId}`,
    );
    await this.agentService.triggerManualAnalysis(oemId);
    this.logger.log('POST /agent/trigger - Analysis completed successfully');
    return {
      message: 'Analysis triggered successfully',
      oemId,
    };
  }
}
