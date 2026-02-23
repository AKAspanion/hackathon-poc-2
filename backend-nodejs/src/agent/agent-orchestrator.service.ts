import { Injectable, Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOllama } from '@langchain/ollama';
import { RiskSeverity } from '../database/entities/risk.entity';
import { OpportunityType } from '../database/entities/opportunity.entity';
import { OemScope } from './agent.types';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private llm: BaseChatModel | undefined;

  constructor() {
    const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();

    if (provider === 'ollama') {
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL || 'llama3';
      this.llm = new ChatOllama({
        baseUrl,
        model,
        temperature: 0.7,
      });
      this.logger.log(`[AI agent] Event: LLM provider initialized — Ollama model=${model} baseUrl=${baseUrl}`);
      this.logger.log(`Using Ollama provider: ${model} at ${baseUrl}`);
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
      if (apiKey) {
        this.llm = new ChatAnthropic({
          model,
          temperature: 0.7,
          apiKey,
        });
        this.logger.log(`[AI agent] Event: LLM provider initialized — Anthropic model=${model}`);
        this.logger.log('Using Anthropic provider');
      } else {
        this.logger.warn('[AI agent] Event: No LLM available — ANTHROPIC_API_KEY not set. All analysis will use mock.');
        this.logger.warn(
          'LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY not set. Using mock analysis.',
        );
      }
    }
  }

  async analyzeData(
    allData: Map<string, any[]>,
    scope?: OemScope | null,
  ): Promise<{
    risks: any[];
    opportunities: any[];
  }> {
    this.logger.log(
      `[trigger] analyzeData started${scope ? ` for OEM: ${scope.oemName}` : ''}`,
    );
    const risks: any[] = [];
    const opportunities: any[] = [];

    for (const [sourceType, dataArray] of allData.entries()) {
      this.logger.log(`[trigger] Analyzing source "${sourceType}" (${dataArray.length} items)`);
      for (let i = 0; i < dataArray.length; i++) {
        const dataItem = dataArray[i];
        this.logger.log(`[trigger] analyzeDataItem: sourceType=${sourceType} itemIndex=${i}`);
        const analysis = await this.analyzeDataItem(sourceType, dataItem, scope);

        if (analysis.risks && analysis.risks.length > 0) {
          risks.push(
            ...analysis.risks.map((r) => ({
              ...r,
              sourceType,
              sourceData: dataItem,
            })),
          );
          this.logger.log(`[trigger] analyzeDataItem: extracted ${analysis.risks.length} risk(s) from ${sourceType}[${i}]`);
        }

        if (analysis.opportunities && analysis.opportunities.length > 0) {
          opportunities.push(
            ...analysis.opportunities.map((o) => ({
              ...o,
              sourceType,
              sourceData: dataItem,
            })),
          );
          this.logger.log(`[trigger] analyzeDataItem: extracted ${analysis.opportunities.length} opportunity(ies) from ${sourceType}[${i}]`);
        }
      }
    }

    this.logger.log(`[trigger] analyzeData completed: total risks=${risks.length} opportunities=${opportunities.length}`);
    return { risks, opportunities };
  }

  /** Global risk agent: analyze global news and return risk assessment only. */
  async analyzeGlobalRisk(
    newsData: Map<string, any[]>,
  ): Promise<{ risks: any[] }> {
    this.logger.log('[trigger] analyzeGlobalRisk started');
    const risks: any[] = [];
    for (const [sourceType, dataArray] of newsData.entries()) {
      for (let i = 0; i < dataArray.length; i++) {
        const dataItem = dataArray[i];
        const payload = dataItem?.data ?? dataItem;
        const analysis = await this.analyzeItemRisksOnly(
          'global_news',
          payload,
          'global_risk',
        );
        if (analysis.risks?.length) {
          risks.push(
            ...analysis.risks.map((r) => ({
              ...r,
              sourceType: 'global_news',
              sourceData: dataItem,
            })),
          );
        }
      }
    }
    this.logger.log(`[trigger] analyzeGlobalRisk completed: ${risks.length} risks`);
    return { risks };
  }

  /** Shipping routes agent: analyze route/traffic data for disruptions; return risks only. */
  async analyzeShippingDisruptions(
    routeData: Map<string, any[]>,
  ): Promise<{ risks: any[] }> {
    this.logger.log('[trigger] analyzeShippingDisruptions started');
    const risks: any[] = [];
    for (const [sourceType, dataArray] of routeData.entries()) {
      for (let i = 0; i < dataArray.length; i++) {
        const dataItem = dataArray[i];
        const payload = dataItem?.data ?? dataItem;
        const analysis = await this.analyzeItemRisksOnly(
          sourceType,
          payload,
          'shipping_routes',
        );
        if (analysis.risks?.length) {
          risks.push(
            ...analysis.risks.map((r) => ({
              ...r,
              sourceType: 'shipping',
              sourceData: dataItem,
            })),
          );
        }
      }
    }
    this.logger.log(`[trigger] analyzeShippingDisruptions completed: ${risks.length} risks`);
    return { risks };
  }

  private async analyzeItemRisksOnly(
    sourceType: string,
    dataItem: any,
    context: 'global_risk' | 'shipping_routes',
  ): Promise<{ risks: any[] }> {
    if (!this.llm) {
      return this.mockAnalyzeItemRisksOnly(sourceType, dataItem, context);
    }
    try {
      const prompt =
        context === 'global_risk'
          ? this.buildGlobalRiskPrompt(dataItem)
          : this.buildShippingDisruptionPrompt(dataItem);
      const response = await this.llm.invoke(prompt);
      const content =
        typeof response.content === 'string'
          ? response.content
          : Array.isArray(response.content)
            ? response.content
                .map((c: any) => c.text || JSON.stringify(c))
                .join('')
            : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        };
      }
    } catch (error) {
      this.logger.error(
        `[AI agent] Error: analyzeItemRisksOnly ${context}`,
        error,
      );
    }
    return this.mockAnalyzeItemRisksOnly(sourceType, dataItem, context);
  }

  private buildGlobalRiskPrompt(dataItem: any): string {
    return `You are a global supply chain risk analyst. Assess the following news/data for GLOBAL supply chain risk (geopolitical, trade, raw materials, pandemics, climate, logistics capacity). Provide a risk assessment only.

Data:
${JSON.stringify(dataItem, null, 2)}

Return ONLY a valid JSON object:
{
  "risks": [
    {
      "title": "Risk title",
      "description": "Detailed description",
      "severity": "low|medium|high|critical",
      "affectedRegion": "Region or global",
      "affectedSupplier": null,
      "estimatedImpact": "Impact description",
      "estimatedCost": 0
    }
  ]
}

If no material risks, return { "risks": [] }. Be concise and actionable.`;
  }

  private buildShippingDisruptionPrompt(dataItem: any): string {
    return `You are a shipping and logistics risk analyst. Analyze the following route/transport data for supply chain disruption risks (delays, port congestion, route closures, capacity).

Data:
${JSON.stringify(dataItem, null, 2)}

Return ONLY a valid JSON object:
{
  "risks": [
    {
      "title": "Risk title",
      "description": "Detailed description",
      "severity": "low|medium|high|critical",
      "affectedRegion": "Route or region (e.g. origin - destination)",
      "affectedSupplier": "Supplier name if inferable, else null",
      "estimatedImpact": "Impact on supply chain",
      "estimatedCost": 0
    }
  ]
}

If no risks, return { "risks": [] }. Be specific to shipping and logistics.`;
  }

  private mockAnalyzeItemRisksOnly(
    sourceType: string,
    dataItem: any,
    context: 'global_risk' | 'shipping_routes',
  ): { risks: any[] } {
    const risks: any[] = [];
    if (context === 'global_risk') {
      const title = (dataItem?.title || dataItem?.description || '').toString();
      if (
        title.length > 0 &&
        (title.toLowerCase().includes('disruption') ||
          title.toLowerCase().includes('crisis') ||
          title.toLowerCase().includes('shortage'))
      ) {
        risks.push({
          title: `Global risk: ${title.slice(0, 60)}`,
          description: dataItem?.description || title,
          severity: RiskSeverity.MEDIUM,
          affectedRegion: 'Global',
          affectedSupplier: null,
          estimatedImpact: 'Potential global supply chain impact',
          estimatedCost: 50000,
        });
      }
    }
    if (context === 'shipping_routes') {
      const status = dataItem?.status || dataItem?.routeStatus;
      const disrupted = status === 'disrupted' || status === 'delayed' || dataItem?.delayDays > 0;
      if (disrupted) {
        const origin = dataItem?.origin || '';
        const destination = dataItem?.destination || '';
        risks.push({
          title: `Shipping disruption: ${origin} → ${destination}`,
          description: `Route disruption (${status || 'delayed'}). ${dataItem?.disruptionReason || 'Unknown cause'}. Delay: ${dataItem?.delayDays ?? '?'} days.`,
          severity: dataItem?.delayDays > 7 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
          affectedRegion: `${origin} - ${destination}`,
          affectedSupplier: null,
          estimatedImpact: 'Delivery delays and inventory risk',
          estimatedCost: 25000,
        });
      }
    }
    return { risks };
  }

  /** Generate a single combined mitigation plan for an affected supplier given multiple risks. */
  async generateCombinedMitigationPlanForSupplier(
    supplierName: string,
    risks: any[],
  ): Promise<any> {
    if (!this.llm) {
      return this.mockGenerateCombinedMitigationPlan(supplierName, risks);
    }
    try {
      const riskSummaries = risks.map(
        (r) =>
          `- ${r.title} (${r.severity}): ${r.description || ''} Region: ${r.affectedRegion || 'N/A'}`,
      );
      const prompt = `You are a supply chain risk manager. Create ONE combined mitigation and contingency plan for the following SUPPLIER addressing ALL listed risks together.

Supplier: ${supplierName}

Risks affecting this supplier:
${riskSummaries.join('\n')}

Return ONLY a valid JSON object:
{
  "title": "Combined Mitigation Plan: [Supplier Name]",
  "description": "Detailed plan covering all risks above",
  "actions": ["Action 1", "Action 2", "Action 3", ...],
  "metadata": { "supplierName": "${supplierName}", "riskCount": ${risks.length} },
  "assignedTo": "Supply Chain / Procurement Team",
  "dueDate": "YYYY-MM-DD"
}

Prioritize actions that address the highest-severity risks first. Be specific and actionable.`;

      const response = await this.llm.invoke(prompt);
      const content =
        typeof response.content === 'string'
          ? response.content
          : Array.isArray(response.content)
            ? response.content
                .map((c: any) => c.text || JSON.stringify(c))
                .join('')
            : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        plan.metadata = {
          ...(plan.metadata || {}),
          combinedForSupplier: supplierName,
          riskIds: risks.map((r) => r.id).filter(Boolean),
        };
        return plan;
      }
    } catch (error) {
      this.logger.error(
        '[AI agent] Error: generateCombinedMitigationPlanForSupplier',
        error,
      );
    }
    return this.mockGenerateCombinedMitigationPlan(supplierName, risks);
  }

  private mockGenerateCombinedMitigationPlan(
    supplierName: string,
    risks: any[],
  ): any {
    return {
      title: `Combined Mitigation Plan: ${supplierName}`,
      description: `Unified contingency plan for ${supplierName} addressing ${risks.length} risk(s). Prioritize supplier communication and alternative sourcing.`,
      actions: [
        'Contact supplier for status and expected recovery',
        'Assess impact on production schedule and customer orders',
        'Identify and qualify backup suppliers or routes',
        'Update inventory and safety stock targets',
        'Document and communicate plan to stakeholders',
      ],
      metadata: {
        combinedForSupplier: supplierName,
        riskIds: risks.map((r) => r.id).filter(Boolean),
        riskCount: risks.length,
      },
      assignedTo: 'Supply Chain Team',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };
  }

  private async analyzeDataItem(
    sourceType: string,
    dataItem: any,
    scope?: OemScope | null,
  ): Promise<{
    risks: any[];
    opportunities: any[];
  }> {
    if (!this.llm) {
      this.logger.log(`[AI agent] Event: analyzeDataItem using mock (no LLM) sourceType=${sourceType}`);
      this.logger.log(`[trigger] API: analyzeDataItem (mock) sourceType=${sourceType}`);
      return this.mockAnalyzeDataItem(sourceType, dataItem);
    }

    try {
      const prompt = this.buildAnalysisPrompt(sourceType, dataItem, scope);
      this.logger.log(`[AI agent] Call: analyzeDataItem sourceType=${sourceType} promptLength=${prompt.length}`);
      this.logger.log(`[AI agent] Prompt (analyzeDataItem): ${prompt}`);
      this.logger.log(`[trigger] API call: LLM invoke (analyzeDataItem) sourceType=${sourceType}`);
      const response = await this.llm.invoke(prompt);
      const content =
        typeof response.content === 'string'
          ? response.content
          : Array.isArray(response.content)
            ? response.content
                .map((c: any) => c.text || JSON.stringify(c))
                .join('')
            : JSON.stringify(response.content);
      this.logger.log(
        `[AI agent] Response (analyzeDataItem) sourceType=${sourceType} contentLength=${content.length}`,
      );
      this.logger.log(`[AI agent] Response content: ${content}`);
      this.logger.log(`[trigger] API response: LLM analyzeDataItem sourceType=${sourceType}`);

      // Parse JSON response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const riskCount = Array.isArray(parsed.risks) ? parsed.risks.length : 0;
          const oppCount = Array.isArray(parsed.opportunities) ? parsed.opportunities.length : 0;
          this.logger.log(`[AI agent] Event: analyzeDataItem parsed successfully risks=${riskCount} opportunities=${oppCount}`);
          return parsed;
        }
      } catch (e) {
        this.logger.warn('[AI agent] Event: analyzeDataItem response parse failed, using mock analysis');
        this.logger.warn(
          'Failed to parse LLM response as JSON, using mock analysis',
        );
      }

      return this.mockAnalyzeDataItem(sourceType, dataItem);
    } catch (error) {
      this.logger.error('[AI agent] Error: analyzeDataItem LLM call failed', error);
      this.logger.error('Error in LLM analysis:', error);
      return this.mockAnalyzeDataItem(sourceType, dataItem);
    }
  }

  private buildAnalysisPrompt(
    sourceType: string,
    dataItem: any,
    scope?: OemScope | null,
  ): string {
    const scopeContext = scope
      ? `
You are analyzing data for OEM: "${scope.oemName}".
Relevant suppliers (focus risks/opportunities on these when applicable): ${scope.supplierNames.join(', ') || 'None specified'}.
Relevant locations: ${[...scope.cities, ...scope.regions, ...scope.countries].filter(Boolean).join(', ') || 'None specified'}.
Relevant commodities: ${scope.commodities.join(', ') || 'None specified'}.
Only report risks and opportunities that are relevant to this OEM's supply chain (suppliers, locations, commodities above).`
      : '';

    return `You are a supply chain risk intelligence agent. Analyze the following ${sourceType} data and identify:
1. Potential risks to supply chain operations (with severity: low, medium, high, critical)
2. Potential opportunities for optimization or cost savings
${scopeContext}

Data:
${JSON.stringify(dataItem, null, 2)}

Return ONLY a valid JSON object with this structure:
{
  "risks": [
    {
      "title": "Risk title",
      "description": "Detailed description",
      "severity": "low|medium|high|critical",
      "affectedRegion": "Region name if applicable",
      "affectedSupplier": "Supplier name if applicable",
      "estimatedImpact": "Impact description",
      "estimatedCost": 0
    }
  ],
  "opportunities": [
    {
      "title": "Opportunity title",
      "description": "Detailed description",
      "type": "cost_saving|time_saving|quality_improvement|market_expansion|supplier_diversification",
      "affectedRegion": "Region name if applicable",
      "potentialBenefit": "Benefit description",
      "estimatedValue": 0
    }
  ]
}

If no risks or opportunities are found, return empty arrays. Be specific and actionable.`;
  }

  private mockAnalyzeDataItem(
    sourceType: string,
    dataItem: any,
  ): {
    risks: any[];
    opportunities: any[];
  } {
    const risks: any[] = [];
    const opportunities: any[] = [];

    // Mock risk detection logic
    if (sourceType === 'weather') {
      if (dataItem.condition === 'Storm' || dataItem.condition === 'Rain') {
        risks.push({
          title: `Weather Alert: ${dataItem.condition} in ${dataItem.city}`,
          description: `Severe weather conditions detected in ${dataItem.city}, ${dataItem.country}. This may impact shipping and logistics operations.`,
          severity: RiskSeverity.HIGH,
          affectedRegion: `${dataItem.city}, ${dataItem.country}`,
          estimatedImpact: 'Potential delays in shipping and transportation',
          estimatedCost: 50000,
        });
      }
    }

    if (sourceType === 'news') {
      const title = dataItem.title?.toLowerCase() || '';
      if (
        title.includes('disruption') ||
        title.includes('closure') ||
        title.includes('delay')
      ) {
        risks.push({
          title: `News Alert: ${dataItem.title}`,
          description:
            dataItem.description || 'Supply chain disruption detected in news',
          severity: RiskSeverity.MEDIUM,
          estimatedImpact: 'Potential supply chain impact',
          estimatedCost: 30000,
        });
      }
    }

    if (sourceType === 'traffic') {
      if (
        dataItem.estimatedDelay > 60 ||
        dataItem.congestionLevel === 'severe'
      ) {
        risks.push({
          title: `Traffic Delay: ${dataItem.origin} to ${dataItem.destination}`,
          description: `Severe traffic congestion detected. Estimated delay: ${dataItem.estimatedDelay} minutes.`,
          severity: RiskSeverity.MEDIUM,
          affectedRegion: `${dataItem.origin} - ${dataItem.destination}`,
          estimatedImpact: `Transportation delay of ${dataItem.estimatedDelay} minutes`,
          estimatedCost: 10000,
        });
      }
    }

    if (sourceType === 'market') {
      if (dataItem.priceChangePercent < -5) {
        opportunities.push({
          title: `Price Drop Opportunity: ${dataItem.commodity}`,
          description: `Significant price drop detected for ${dataItem.commodity}. Consider strategic purchasing.`,
          type: OpportunityType.COST_SAVING,
          potentialBenefit: `Potential cost savings on ${dataItem.commodity} procurement`,
          estimatedValue: Math.abs(dataItem.priceChange) * 1000,
        });
      }
    }

    return { risks, opportunities };
  }

  async generateMitigationPlan(risk: any): Promise<any> {
    if (!this.llm) {
      this.logger.log(`[AI agent] Event: generateMitigationPlan using mock (no LLM) riskId=${risk.id}`);
      this.logger.log(`[trigger] API: generateMitigationPlan (mock) riskId=${risk.id}`);
      return this.mockGenerateMitigationPlan(risk);
    }

    try {
      const prompt = `Generate a detailed mitigation plan for this supply chain risk:

Title: ${risk.title}
Description: ${risk.description}
Severity: ${risk.severity}
Affected Region: ${risk.affectedRegion || 'N/A'}
Affected Supplier: ${risk.affectedSupplier || 'N/A'}

Return ONLY a valid JSON object:
{
  "title": "Mitigation Plan Title",
  "description": "Detailed plan description",
  "actions": ["Action 1", "Action 2", "Action 3"],
  "metadata": {},
  "assignedTo": "Team/Person name",
  "dueDate": "YYYY-MM-DD"
}`;

      this.logger.log(`[AI agent] Call: generateMitigationPlan riskId=${risk.id} title="${risk.title}" promptLength=${prompt.length}`);
      this.logger.log(`[AI agent] Prompt (generateMitigationPlan): ${prompt}`);
      this.logger.log(`[trigger] API call: LLM invoke (generateMitigationPlan) riskId=${risk.id} title="${risk.title}"`);
      const response = await this.llm.invoke(prompt);
      const content =
        typeof response.content === 'string'
          ? response.content
          : Array.isArray(response.content)
            ? response.content
                .map((c: any) => c.text || JSON.stringify(c))
                .join('')
            : JSON.stringify(response.content);
      this.logger.log(
        `[AI agent] Response (generateMitigationPlan) riskId=${risk.id} contentLength=${content.length}`,
      );
      this.logger.log(`[AI agent] Response content: ${content}`);
      this.logger.log(`[trigger] API response: LLM generateMitigationPlan riskId=${risk.id}`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        this.logger.log(`[AI agent] Event: generateMitigationPlan parsed planTitle="${plan.title || 'n/a'}" actions=${plan.actions?.length ?? 0}`);
        return plan;
      }
    } catch (error) {
      this.logger.error('[AI agent] Error: generateMitigationPlan LLM call failed', error);
      this.logger.error('Error generating mitigation plan:', error);
    }

    return this.mockGenerateMitigationPlan(risk);
  }

  async generateOpportunityPlan(opportunity: any): Promise<any> {
    if (!this.llm) {
      this.logger.log(`[AI agent] Event: generateOpportunityPlan using mock (no LLM) opportunityId=${opportunity.id}`);
      this.logger.log(`[trigger] API: generateOpportunityPlan (mock) opportunityId=${opportunity.id}`);
      return this.mockGenerateOpportunityPlan(opportunity);
    }

    try {
      const prompt = `Generate an action plan to capitalize on this supply chain opportunity:

Title: ${opportunity.title}
Description: ${opportunity.description}
Type: ${opportunity.type}
Potential Benefit: ${opportunity.potentialBenefit || 'N/A'}

Return ONLY a valid JSON object:
{
  "title": "Action Plan Title",
  "description": "Detailed plan description",
  "actions": ["Action 1", "Action 2", "Action 3"],
  "metadata": {},
  "assignedTo": "Team/Person name",
  "dueDate": "YYYY-MM-DD"
}`;

      this.logger.log(`[AI agent] Call: generateOpportunityPlan opportunityId=${opportunity.id} title="${opportunity.title}" promptLength=${prompt.length}`);
      this.logger.log(`[AI agent] Prompt (generateOpportunityPlan): ${prompt}`);
      this.logger.log(`[trigger] API call: LLM invoke (generateOpportunityPlan) opportunityId=${opportunity.id} title="${opportunity.title}"`);
      const response = await this.llm.invoke(prompt);
      const content =
        typeof response.content === 'string'
          ? response.content
          : Array.isArray(response.content)
            ? response.content
                .map((c: any) => c.text || JSON.stringify(c))
                .join('')
            : JSON.stringify(response.content);
      this.logger.log(
        `[AI agent] Response (generateOpportunityPlan) opportunityId=${opportunity.id} contentLength=${content.length}`,
      );
      this.logger.log(`[AI agent] Response content: ${content}`);
      this.logger.log(`[trigger] API response: LLM generateOpportunityPlan opportunityId=${opportunity.id}`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        this.logger.log(`[AI agent] Event: generateOpportunityPlan parsed planTitle="${plan.title || 'n/a'}" actions=${plan.actions?.length ?? 0}`);
        return plan;
      }
    } catch (error) {
      this.logger.error('[AI agent] Error: generateOpportunityPlan LLM call failed', error);
      this.logger.error('Error generating opportunity plan:', error);
    }

    return this.mockGenerateOpportunityPlan(opportunity);
  }

  private mockGenerateMitigationPlan(risk: any): any {
    return {
      title: `Mitigation Plan: ${risk.title}`,
      description: `Comprehensive mitigation strategy to address ${risk.severity} severity risk`,
      actions: [
        'Assess immediate impact on operations',
        'Contact affected suppliers for status update',
        'Identify alternative suppliers or routes',
        'Implement contingency logistics plan',
        'Monitor situation and update stakeholders',
      ],
      metadata: {
        riskSeverity: risk.severity,
        autoGenerated: true,
      },
      assignedTo: 'Supply Chain Team',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };
  }

  private mockGenerateOpportunityPlan(opportunity: any): any {
    return {
      title: `Action Plan: ${opportunity.title}`,
      description: `Strategic plan to capitalize on identified opportunity`,
      actions: [
        'Evaluate opportunity feasibility',
        'Calculate potential ROI',
        'Develop implementation timeline',
        'Secure necessary approvals',
        'Execute opportunity capture plan',
      ],
      metadata: {
        opportunityType: opportunity.type,
        autoGenerated: true,
      },
      assignedTo: 'Strategic Planning Team',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };
  }
}
