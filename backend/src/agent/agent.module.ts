import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentStatusEntity } from '../database/entities/agent-status.entity';
import { Risk } from '../database/entities/risk.entity';
import { Opportunity } from '../database/entities/opportunity.entity';
import { MitigationPlan } from '../database/entities/mitigation-plan.entity';
import { DataSourceModule } from '../data-sources/data-source.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentStatusEntity,
      Risk,
      Opportunity,
      MitigationPlan,
    ]),
    DataSourceModule,
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentOrchestratorService],
  exports: [AgentService],
})
export class AgentModule {}
