import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSourceManagerService } from '../data-sources/data-source-manager.service';
import {
  AgentStatusEntity,
  AgentStatus,
} from '../database/entities/agent-status.entity';
import {
  Risk,
  RiskSeverity,
  RiskStatus,
} from '../database/entities/risk.entity';
import {
  Opportunity,
  OpportunityType,
  OpportunityStatus,
} from '../database/entities/opportunity.entity';
import {
  MitigationPlan,
  PlanStatus,
} from '../database/entities/mitigation-plan.entity';
import { AgentOrchestratorService } from './agent-orchestrator.service';

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private isRunning = false;

  constructor(
    @InjectRepository(AgentStatusEntity)
    private agentStatusRepository: Repository<AgentStatusEntity>,
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(MitigationPlan)
    private mitigationPlanRepository: Repository<MitigationPlan>,
    private dataSourceManager: DataSourceManagerService,
    private agentOrchestrator: AgentOrchestratorService,
  ) {}

  async onModuleInit() {
    // Initialize agent status
    let status = await this.agentStatusRepository.findOne({ where: {} });
    if (!status) {
      status = this.agentStatusRepository.create({
        status: AgentStatus.IDLE,
        risksDetected: 0,
        opportunitiesIdentified: 0,
        plansGenerated: 0,
      });
      await this.agentStatusRepository.save(status);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorAndAnalyze() {
    if (this.isRunning) {
      this.logger.warn('Agent is already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    this.logger.log('[trigger] Starting monitoring cycle');

    try {
      this.logger.log('[trigger] Status -> MONITORING: Fetching data from all sources');
      await this.updateStatus(
        AgentStatus.MONITORING,
        'Fetching data from all sources',
      );

      const allData = await this.dataSourceManager.fetchAllDataSources();
      const sourceSummary = Array.from(allData.entries())
        .map(([k, v]) => `${k}:${v.length}`)
        .join(', ');
      this.logger.log(`[trigger] Data fetch complete. Sources: ${sourceSummary}`);

      this.logger.log('[trigger] Status -> ANALYZING: Analyzing data for risks and opportunities');
      await this.updateStatus(
        AgentStatus.ANALYZING,
        'Analyzing data for risks and opportunities',
      );

      const analysisResults = await this.agentOrchestrator.analyzeData(allData);
      this.logger.log(
        `[trigger] Analysis complete. Risks: ${analysisResults.risks.length}, Opportunities: ${analysisResults.opportunities.length}`,
      );

      this.logger.log('[trigger] Status -> PROCESSING: Processing analysis results');
      await this.updateStatus(
        AgentStatus.PROCESSING,
        'Processing analysis results',
      );

      for (const riskData of analysisResults.risks) {
        const saved = await this.saveRisk(riskData);
        this.logger.log(`[trigger] Risk saved: id=${saved.id} title="${saved.title}"`);
      }
      this.logger.log(`[trigger] Saved ${analysisResults.risks.length} risks`);

      for (const opportunityData of analysisResults.opportunities) {
        const saved = await this.saveOpportunity(opportunityData);
        this.logger.log(`[trigger] Opportunity saved: id=${saved.id} title="${saved.title}"`);
      }
      this.logger.log(`[trigger] Saved ${analysisResults.opportunities.length} opportunities`);

      const risks = await this.riskRepository.find({
        where: { status: RiskStatus.DETECTED },
        relations: ['mitigationPlans'],
      });
      const risksNeedingPlans = risks.filter((r) => r.mitigationPlans.length === 0);
      this.logger.log(`[trigger] Generating mitigation plans for ${risksNeedingPlans.length} risks (${risks.length} total detected)`);

      for (const risk of risks) {
        if (risk.mitigationPlans.length === 0) {
          this.logger.log(`[trigger] API call: generateMitigationPlan for risk id=${risk.id} title="${risk.title}"`);
          const plan =
            await this.agentOrchestrator.generateMitigationPlan(risk);
          const savedPlan = await this.saveMitigationPlan(plan, risk.id);
          this.logger.log(`[trigger] Mitigation plan saved: id=${savedPlan.id} for risk id=${risk.id}`);
        }
      }

      const opportunities = await this.opportunityRepository.find({
        where: { status: OpportunityStatus.IDENTIFIED },
        relations: ['mitigationPlans'],
      });
      const opportunitiesNeedingPlans = opportunities.filter(
        (o) => o.mitigationPlans.length === 0,
      );
      this.logger.log(`[trigger] Generating opportunity plans for ${opportunitiesNeedingPlans.length} opportunities (${opportunities.length} total identified)`);

      for (const opportunity of opportunities) {
        if (opportunity.mitigationPlans.length === 0) {
          this.logger.log(`[trigger] API call: generateOpportunityPlan for opportunity id=${opportunity.id} title="${opportunity.title}"`);
          const plan =
            await this.agentOrchestrator.generateOpportunityPlan(opportunity);
          const savedPlan = await this.saveMitigationPlan(plan, null, opportunity.id);
          this.logger.log(`[trigger] Opportunity plan saved: id=${savedPlan.id} for opportunity id=${opportunity.id}`);
        }
      }

      const status = await this.agentStatusRepository.findOne({ where: {} });
      if (status) {
        status.risksDetected = await this.riskRepository.count();
        status.opportunitiesIdentified =
          await this.opportunityRepository.count();
        status.plansGenerated = await this.mitigationPlanRepository.count();
        status.lastProcessedData = {
          timestamp: new Date().toISOString(),
          sourcesProcessed: Array.from(allData.keys()),
        };
        await this.agentStatusRepository.save(status);
        this.logger.log(
          `[trigger] Stats updated: risks=${status.risksDetected} opportunities=${status.opportunitiesIdentified} plans=${status.plansGenerated}`,
        );
      }

      await this.updateStatus(AgentStatus.IDLE, 'Monitoring cycle completed');
      this.logger.log('[trigger] Monitoring cycle completed successfully');
    } catch (error) {
      this.logger.error('[trigger] Error in monitoring cycle', error);
      await this.updateStatus(AgentStatus.ERROR, `Error: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async updateStatus(status: AgentStatus, task?: string) {
    const agentStatus = await this.agentStatusRepository.findOne({ where: {} });
    if (agentStatus) {
      agentStatus.status = status;
      agentStatus.currentTask = task;
      agentStatus.lastUpdated = new Date();
      await this.agentStatusRepository.save(agentStatus);
    }
  }

  private async saveRisk(riskData: any) {
    const risk = this.riskRepository.create({
      title: riskData.title,
      description: riskData.description,
      severity: riskData.severity || RiskSeverity.MEDIUM,
      status: RiskStatus.DETECTED,
      sourceType: riskData.sourceType,
      sourceData: riskData.sourceData,
      affectedRegion: riskData.affectedRegion,
      affectedSupplier: riskData.affectedSupplier,
      estimatedImpact: riskData.estimatedImpact,
      estimatedCost: riskData.estimatedCost,
    });
    return await this.riskRepository.save(risk);
  }

  private async saveOpportunity(opportunityData: any) {
    const opportunity = this.opportunityRepository.create({
      title: opportunityData.title,
      description: opportunityData.description,
      type: opportunityData.type || OpportunityType.COST_SAVING,
      status: OpportunityStatus.IDENTIFIED,
      sourceType: opportunityData.sourceType,
      sourceData: opportunityData.sourceData,
      affectedRegion: opportunityData.affectedRegion,
      potentialBenefit: opportunityData.potentialBenefit,
      estimatedValue: opportunityData.estimatedValue,
    });
    return await this.opportunityRepository.save(opportunity);
  }

  private async saveMitigationPlan(
    planData: any,
    riskId?: string,
    opportunityId?: string,
  ) {
    const plan = this.mitigationPlanRepository.create({
      title: planData.title,
      description: planData.description,
      actions: planData.actions || [],
      status: PlanStatus.DRAFT,
      riskId,
      opportunityId,
      metadata: planData.metadata,
      assignedTo: planData.assignedTo,
      dueDate: planData.dueDate ? new Date(planData.dueDate) : null,
    });
    return await this.mitigationPlanRepository.save(plan);
  }

  async getStatus(): Promise<AgentStatusEntity> {
    return await this.agentStatusRepository.findOne({ where: {} });
  }

  async triggerManualAnalysis() {
    this.logger.log('[trigger] triggerManualAnalysis called');
    await this.monitorAndAnalyze();
    this.logger.log('[trigger] triggerManualAnalysis finished');
  }
}
