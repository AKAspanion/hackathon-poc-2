import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentStatusEntity } from '../database/entities/agent-status.entity';
import { Risk } from '../database/entities/risk.entity';
import { Opportunity } from '../database/entities/opportunity.entity';
import { MitigationPlan } from '../database/entities/mitigation-plan.entity';
import { SupplyChainRiskScore } from '../database/entities/supply-chain-risk-score.entity';
import { DataSourceModule } from '../data-sources/data-source.module';
import { OemsModule } from '../oems/oems.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentStatusEntity,
      Risk,
      Opportunity,
      MitigationPlan,
      SupplyChainRiskScore,
    ]),
    DataSourceModule,
    OemsModule,
    SuppliersModule,
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentOrchestratorService],
  exports: [AgentService],
})
export class AgentModule {}
