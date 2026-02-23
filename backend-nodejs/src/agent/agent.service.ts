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
import { SupplyChainRiskScore } from '../database/entities/supply-chain-risk-score.entity';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { OemsService } from '../oems/oems.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { OemScope } from './agent.types';

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

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
    @InjectRepository(SupplyChainRiskScore)
    private riskScoreRepository: Repository<SupplyChainRiskScore>,
    private dataSourceManager: DataSourceManagerService,
    private agentOrchestrator: AgentOrchestratorService,
    private oemsService: OemsService,
    private suppliersService: SuppliersService,
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

  /** Build OEM scope from suppliers (names, locations, cities, countries, regions, commodities). */
  async getOemScope(oemId: string): Promise<OemScope | null> {
    const oem = await this.oemsService.findById(oemId);
    if (!oem) return null;
    const suppliers = await this.suppliersService.findAll(oemId);
    const supplierNames: string[] = [];
    const locations: string[] = [];
    const cities: string[] = [];
    const countries: string[] = [];
    const regions: string[] = [];
    const commoditySet = new Set<string>();

    for (const s of suppliers) {
      if (s.name) supplierNames.push(s.name);
      if (s.location) locations.push(s.location);
      if (s.city) cities.push(s.city);
      if (s.country) countries.push(s.country);
      if (s.region) regions.push(s.region);
      if (s.commodities) {
        s.commodities
          .split(/[,;]/)
          .map((c) => c.trim())
          .filter(Boolean)
          .forEach((c) => commoditySet.add(c));
      }
    }

    return {
      oemId,
      oemName: oem.name,
      supplierNames: [...new Set(supplierNames)],
      locations: [...new Set(locations)],
      cities: [...new Set(cities)],
      countries: [...new Set(countries)],
      regions: [...new Set(regions)],
      commodities: Array.from(commoditySet),
    };
  }

  /** Build data source params from OEM scope (cities, commodities, routes, keywords). */
  private buildDataSourceParams(scope: OemScope): Record<string, any> {
    const cities =
      scope.cities.length > 0
        ? scope.cities
        : scope.locations.length > 0
          ? scope.locations.slice(0, 10)
          : ['New York', 'London', 'Tokyo', 'Mumbai', 'Shanghai'];
    const commodities =
      scope.commodities.length > 0
        ? scope.commodities
        : ['steel', 'copper', 'oil', 'grain', 'semiconductors'];
    const routes =
      cities.length >= 2
        ? [
            { origin: cities[0], destination: cities[1] },
            ...(cities.length >= 4
              ? [{ origin: cities[2], destination: cities[3] }]
              : []),
          ]
        : [{ origin: 'New York', destination: 'Los Angeles' }];
    const keywords = [
      'supply chain',
      'manufacturing',
      'logistics',
      ...scope.commodities.slice(0, 3),
    ].filter(Boolean);
    return { cities, commodities, routes, keywords };
  }

  /** Params for global news fetch (global risk agent). */
  private buildGlobalNewsParams(): Record<string, any> {
    return {
      keywords: [
        'global supply chain',
        'geopolitical risk',
        'trade disruption',
        'raw materials shortage',
        'logistics crisis',
        'shipping capacity',
      ],
    };
  }

  /** Run full analysis cycle for a single OEM: 3 agents + risk score + supplier mitigation. */
  private async runAnalysisForOem(scope: OemScope): Promise<void> {
    const oemId = scope.oemId;

    // ——— 1. Supplier-scoped agent: get suppliers from DB, fetch weather + news for their locations, feed to AI ———
    await this.updateStatus(
      AgentStatus.MONITORING,
      `Fetching weather & news for OEM: ${scope.oemName}`,
    );
    const supplierParams = this.buildDataSourceParams(scope);
    const supplierData = await this.dataSourceManager.fetchDataSourcesByTypes(
      ['weather', 'news'],
      supplierParams,
    );
    this.logger.log(
      `[trigger] OEM ${scope.oemName} — Supplier data: weather=${supplierData.get('weather')?.length ?? 0}, news=${supplierData.get('news')?.length ?? 0}`,
    );

    await this.updateStatus(
      AgentStatus.ANALYZING,
      `Analyzing weather & news for OEM: ${scope.oemName}`,
    );
    const supplierAnalysis = await this.agentOrchestrator.analyzeData(
      supplierData,
      scope,
    );

    await this.updateStatus(
      AgentStatus.PROCESSING,
      `Saving supplier-scoped results for OEM: ${scope.oemName}`,
    );
    for (const riskData of supplierAnalysis.risks) {
      await this.saveRisk(riskData, oemId);
    }
    for (const opportunityData of supplierAnalysis.opportunities) {
      await this.saveOpportunity(opportunityData, oemId);
    }

    // ——— 2. Global risk agent: global news → risk assessment ———
    await this.updateStatus(
      AgentStatus.MONITORING,
      `Fetching global news for risk assessment`,
    );
    const globalNewsData = await this.dataSourceManager.fetchDataSourcesByTypes(
      ['news'],
      this.buildGlobalNewsParams(),
    );
    const globalResult = await this.agentOrchestrator.analyzeGlobalRisk(
      globalNewsData,
    );
    for (const riskData of globalResult.risks) {
      await this.saveRisk(riskData, oemId);
    }
    this.logger.log(
      `[trigger] OEM ${scope.oemName} — Global risks saved: ${globalResult.risks.length}`,
    );

    // ——— 3. Shipping routes agent: routes + disruption data → risks ———
    await this.updateStatus(
      AgentStatus.MONITORING,
      `Fetching shipping routes for OEM: ${scope.oemName}`,
    );
    const routeParams = {
      routes: supplierParams.routes,
    };
    const routeData = await this.dataSourceManager.fetchDataSourcesByTypes(
      ['traffic', 'shipping'],
      routeParams,
    );
    const shippingResult =
      await this.agentOrchestrator.analyzeShippingDisruptions(routeData);
    for (const riskData of shippingResult.risks) {
      await this.saveRisk(riskData, oemId);
    }
    this.logger.log(
      `[trigger] OEM ${scope.oemName} — Shipping risks saved: ${shippingResult.risks.length}`,
    );

    // ——— 4. Combine all risks and compute supply chain risk score ———
    const allRisks = await this.riskRepository.find({
      where: { oemId, status: RiskStatus.DETECTED },
    });
    const { overallScore, breakdown, severityCounts } =
      this.computeRiskScore(allRisks);
    await this.riskScoreRepository.save(
      this.riskScoreRepository.create({
        oemId,
        overallScore,
        breakdown,
        severityCounts,
        riskIds: allRisks.map((r) => r.id),
      }),
    );
    this.logger.log(
      `[trigger] OEM ${scope.oemName} — Risk score saved: ${overallScore}`,
    );

    // ——— 5. Risk and mitigation plan for affected suppliers (combined plan per supplier) ———
    const risksBySupplier = new Map<string, Risk[]>();
    for (const risk of allRisks) {
      const key = (risk.affectedSupplier || '').trim();
      if (!key) continue;
      if (!risksBySupplier.has(key)) risksBySupplier.set(key, []);
      risksBySupplier.get(key)!.push(risk);
    }

    for (const [supplierName, risks] of risksBySupplier.entries()) {
      const plan = await this.agentOrchestrator.generateCombinedMitigationPlanForSupplier(
        supplierName,
        risks,
      );
      const firstRiskId = risks[0]?.id;
      const savedPlan = await this.saveMitigationPlan(
        plan,
        firstRiskId ?? undefined,
      );
      this.logger.log(
        `[trigger] OEM ${scope.oemName} — Combined mitigation plan for supplier "${supplierName}": id=${savedPlan.id}`,
      );
    }

    // Per-risk mitigation for risks that have no affectedSupplier or no combined plan yet
    const risksWithPlans = new Set(
      Array.from(risksBySupplier.values()).flatMap((r) => r.map((x) => x.id)),
    );
    const risksNeedingPlan = await this.riskRepository.find({
      where: { oemId, status: RiskStatus.DETECTED },
      relations: ['mitigationPlans'],
    });
    for (const risk of risksNeedingPlan) {
      if (risk.mitigationPlans.length > 0) continue;
      if (risksBySupplier.has((risk.affectedSupplier || '').trim())) continue;
      const plan = await this.agentOrchestrator.generateMitigationPlan(risk);
      await this.saveMitigationPlan(plan, risk.id);
    }

    // Opportunity plans (unchanged)
    const opportunities = await this.opportunityRepository.find({
      where: { status: OpportunityStatus.IDENTIFIED, oemId },
      relations: ['mitigationPlans'],
    });
    for (const opportunity of opportunities) {
      if (opportunity.mitigationPlans.length === 0) {
        const plan =
          await this.agentOrchestrator.generateOpportunityPlan(opportunity);
        await this.saveMitigationPlan(plan, null, opportunity.id);
      }
    }
  }

  /** Compute overall risk score 0–100 and breakdown by sourceType and severity. */
  private computeRiskScore(
    risks: Risk[],
  ): {
    overallScore: number;
    breakdown: Record<string, number>;
    severityCounts: Record<string, number>;
  } {
    const severityCounts: Record<string, number> = {};
    const breakdown: Record<string, number> = {};
    let weightedSum = 0;

    for (const r of risks) {
      const sev = (r.severity || 'medium').toLowerCase();
      severityCounts[sev] = (severityCounts[sev] || 0) + 1;
      weightedSum += SEVERITY_WEIGHT[sev] ?? 2;
      const src = r.sourceType || 'other';
      breakdown[src] = (breakdown[src] || 0) + (SEVERITY_WEIGHT[sev] ?? 2);
    }

    const count = risks.length;
    const avgSeverity = count > 0 ? weightedSum / count : 0;
    const overallScore = Math.min(
      100,
      Math.round(avgSeverity * 25),
    );

    return { overallScore, breakdown, severityCounts };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorAndAnalyze() {
    if (this.isRunning) {
      this.logger.warn('Agent is already running, skipping this cycle');
      return;
    }
    this.isRunning = true;
    this.logger.log('[trigger] Starting monitoring cycle (all OEMs)');

    try {
      const oems = await this.oemsService.findAll();
      if (oems.length === 0) {
        this.logger.log('[trigger] No OEMs registered, skipping analysis');
        await this.updateStatus(AgentStatus.IDLE, 'No OEMs to process');
        return;
      }

      for (const oem of oems) {
        const scope = await this.getOemScope(oem.id);
        if (!scope) continue;
        this.logger.log(
          `[trigger] Processing OEM: ${scope.oemName} (suppliers: ${scope.supplierNames.length}, locations: ${scope.cities.length}, commodities: ${scope.commodities.length})`,
        );
        await this.runAnalysisForOem(scope);
      }

      const status = await this.agentStatusRepository.findOne({ where: {} });
      if (status) {
        status.risksDetected = await this.riskRepository.count();
        status.opportunitiesIdentified =
          await this.opportunityRepository.count();
        status.plansGenerated = await this.mitigationPlanRepository.count();
        status.lastProcessedData = {
          timestamp: new Date().toISOString(),
          oemsProcessed: oems.map((o) => o.name),
        };
        await this.agentStatusRepository.save(status);
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

  private async saveRisk(riskData: any, oemId?: string | null) {
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
      oemId: oemId ?? null,
    });
    return await this.riskRepository.save(risk);
  }

  private async saveOpportunity(
    opportunityData: any,
    oemId?: string | null,
  ) {
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
      oemId: oemId ?? null,
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

  /** Get latest supply chain risk score for an OEM (from combined agent runs). */
  async getLatestRiskScore(
    oemId: string,
  ): Promise<SupplyChainRiskScore | null> {
    return this.riskScoreRepository.findOne({
      where: { oemId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Trigger analysis manually. When oemId is provided, runs only for that OEM
   * (using its suppliers, locations, commodities). Otherwise runs for all OEMs.
   */
  async triggerManualAnalysis(oemId?: string) {
    this.logger.log(
      `[trigger] triggerManualAnalysis called${oemId ? ` for OEM ${oemId}` : ' (all OEMs)'}`,
    );
    if (this.isRunning) {
      this.logger.warn('Agent is already running');
      return;
    }
    if (oemId) {
      this.isRunning = true;
      try {
        const scope = await this.getOemScope(oemId);
        if (!scope) {
          this.logger.warn(`[trigger] OEM ${oemId} not found or has no scope`);
          return;
        }
        await this.updateStatus(
          AgentStatus.MONITORING,
          `Manual run for OEM: ${scope.oemName}`,
        );
        await this.runAnalysisForOem(scope);
        const status = await this.agentStatusRepository.findOne({ where: {} });
        if (status) {
          status.risksDetected = await this.riskRepository.count();
          status.opportunitiesIdentified =
            await this.opportunityRepository.count();
          status.plansGenerated = await this.mitigationPlanRepository.count();
          status.lastProcessedData = {
            timestamp: new Date().toISOString(),
            oemsProcessed: [scope.oemName],
          };
          await this.agentStatusRepository.save(status);
        }
        await this.updateStatus(AgentStatus.IDLE, 'Manual analysis completed');
      } finally {
        this.isRunning = false;
      }
    } else {
      await this.monitorAndAnalyze();
    }
    this.logger.log('[trigger] triggerManualAnalysis finished');
  }
}
