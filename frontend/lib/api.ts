import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface AgentStatus {
  id: string;
  status: 'idle' | 'monitoring' | 'analyzing' | 'processing' | 'error';
  currentTask?: string;
  lastProcessedData?: Record<string, unknown>;
  lastDataSource?: string;
  errorMessage?: string;
  risksDetected: number;
  opportunitiesIdentified: number;
  plansGenerated: number;
  lastUpdated: string;
  createdAt: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'analyzing' | 'mitigating' | 'resolved' | 'false_positive';
  sourceType: string;
  sourceData?: Record<string, unknown>;
  affectedRegion?: string;
  affectedSupplier?: string;
  estimatedImpact?: string;
  estimatedCost?: number;
  mitigationPlans?: MitigationPlan[];
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: 'cost_saving' | 'time_saving' | 'quality_improvement' | 'market_expansion' | 'supplier_diversification';
  status: 'identified' | 'evaluating' | 'implementing' | 'realized' | 'expired';
  sourceType: string;
  sourceData?: Record<string, unknown>;
  affectedRegion?: string;
  potentialBenefit?: string;
  estimatedValue?: number;
  mitigationPlans?: MitigationPlan[];
  createdAt: string;
  updatedAt: string;
}

export interface MitigationPlan {
  id: string;
  title: string;
  description: string;
  actions: string[];
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  riskId?: string;
  opportunityId?: string;
  risk?: Risk;
  opportunity?: Opportunity;
  metadata?: Record<string, unknown>;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// API functions
export const agentApi = {
  getStatus: () => api.get<AgentStatus>('/agent/status').then(res => res.data),
  triggerAnalysis: () => api.post('/agent/trigger').then(res => res.data),
};

export const risksApi = {
  getAll: (params?: { status?: string; severity?: string }) =>
    api.get<Risk[]>('/risks', { params }).then(res => res.data),
  getById: (id: string) => api.get<Risk>(`/risks/${id}`).then(res => res.data),
  getStats: () => api.get('/risks/stats/summary').then(res => res.data),
};

export const opportunitiesApi = {
  getAll: (params?: { status?: string; type?: string }) =>
    api.get<Opportunity[]>('/opportunities', { params }).then(res => res.data),
  getById: (id: string) => api.get<Opportunity>(`/opportunities/${id}`).then(res => res.data),
  getStats: () => api.get('/opportunities/stats/summary').then(res => res.data),
};

export const mitigationPlansApi = {
  getAll: (params?: { riskId?: string; opportunityId?: string; status?: string }) =>
    api.get<MitigationPlan[]>('/mitigation-plans', { params }).then(res => res.data),
  getById: (id: string) => api.get<MitigationPlan>(`/mitigation-plans/${id}`).then(res => res.data),
};
