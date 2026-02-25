'use client';

import { AgentStatus } from '@/components/AgentStatus';
import { RisksList } from '@/components/RisksList';
import { OpportunitiesList } from '@/components/OpportunitiesList';
import { MitigationPlansList } from '@/components/MitigationPlansList';
import { SuppliersList } from '@/components/SuppliersList';
import { AppNav } from '@/components/AppNav';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApi } from '@/lib/api';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';

export default function Home() {
  const queryClient = useQueryClient();
  useWebSocketNotifications();
  const triggerMutation = useMutation({
    mutationFn: agentApi.triggerAnalysis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-status'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['mitigation-plans'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const handleTriggerAnalysis = () => {
    triggerMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Predictive Supply Chain Agent
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Global Watchtower for Manufacturing Logistics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <AppNav />
              <button
                onClick={handleTriggerAnalysis}
                disabled={triggerMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {triggerMutation.isPending ? 'Triggering...' : 'Trigger Analysis'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <AgentStatus />
        </div>

        <div className="mb-6">
          <SuppliersList />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RisksList />
          <OpportunitiesList />
        </div>

        <div className="mb-6">
          <MitigationPlansList />
        </div>
      </main>
    </div>
  );
}
