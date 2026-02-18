import { Injectable, Logger } from '@nestjs/common';
import { ChatAnthropic } from '@langchain/anthropic';
import { RiskSeverity } from '../database/entities/risk.entity';
import { OpportunityType } from '../database/entities/opportunity.entity';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private llm: ChatAnthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.llm = new ChatAnthropic({
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        apiKey: apiKey,
      });
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not set. Using mock analysis.');
    }
  }

  async analyzeData(allData: Map<string, any[]>): Promise<{
    risks: any[];
    opportunities: any[];
  }> {
    const risks: any[] = [];
    const opportunities: any[] = [];

    // Process each data source
    for (const [sourceType, dataArray] of allData.entries()) {
      for (const dataItem of dataArray) {
        const analysis = await this.analyzeDataItem(sourceType, dataItem);

        if (analysis.risks && analysis.risks.length > 0) {
          risks.push(
            ...analysis.risks.map((r) => ({
              ...r,
              sourceType,
              sourceData: dataItem,
            })),
          );
        }

        if (analysis.opportunities && analysis.opportunities.length > 0) {
          opportunities.push(
            ...analysis.opportunities.map((o) => ({
              ...o,
              sourceType,
              sourceData: dataItem,
            })),
          );
        }
      }
    }

    return { risks, opportunities };
  }

  private async analyzeDataItem(
    sourceType: string,
    dataItem: any,
  ): Promise<{
    risks: any[];
    opportunities: any[];
  }> {
    if (!this.llm) {
      // Mock analysis for development
      return this.mockAnalyzeDataItem(sourceType, dataItem);
    }

    try {
      const prompt = this.buildAnalysisPrompt(sourceType, dataItem);
      const response = await this.llm.invoke(prompt);
      const content =
        typeof response.content === 'string'
          ? response.content
          : Array.isArray(response.content)
            ? response.content
                .map((c: any) => c.text || JSON.stringify(c))
                .join('')
            : JSON.stringify(response.content);

      // Parse JSON response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        this.logger.warn(
          'Failed to parse LLM response as JSON, using mock analysis',
        );
      }

      return this.mockAnalyzeDataItem(sourceType, dataItem);
    } catch (error) {
      this.logger.error('Error in LLM analysis:', error);
      return this.mockAnalyzeDataItem(sourceType, dataItem);
    }
  }

  private buildAnalysisPrompt(sourceType: string, dataItem: any): string {
    return `You are a supply chain risk intelligence agent. Analyze the following ${sourceType} data and identify:
1. Potential risks to supply chain operations (with severity: low, medium, high, critical)
2. Potential opportunities for optimization or cost savings

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
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.error('Error generating mitigation plan:', error);
    }

    return this.mockGenerateMitigationPlan(risk);
  }

  async generateOpportunityPlan(opportunity: any): Promise<any> {
    if (!this.llm) {
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
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
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
