import { Controller, Get, Post } from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('status')
  async getStatus() {
    return await this.agentService.getStatus();
  }

  @Post('trigger')
  async triggerAnalysis() {
    await this.agentService.triggerManualAnalysis();
    return { message: 'Analysis triggered successfully' };
  }
}
