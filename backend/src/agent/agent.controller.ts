import { Controller, Get, Logger, Post } from '@nestjs/common';
import { AgentService } from './agent.service';

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

  @Post('trigger')
  async triggerAnalysis() {
    this.logger.log('POST /agent/trigger - Analysis trigger requested');
    await this.agentService.triggerManualAnalysis();
    this.logger.log('POST /agent/trigger - Analysis completed successfully');
    return { message: 'Analysis triggered successfully' };
  }
}
