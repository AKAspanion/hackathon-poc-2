'use client';

import { useQuery } from '@tanstack/react-query';
import { agentApi, AgentStatus as AgentStatusType } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const statusColors = {
  idle: 'bg-gray-500',
  monitoring: 'bg-blue-500',
  analyzing: 'bg-yellow-500',
  processing: 'bg-purple-500',
  error: 'bg-red-500',
};

const statusLabels = {
  idle: 'Idle',
  monitoring: 'Monitoring',
  analyzing: 'Analyzing',
  processing: 'Processing',
  error: 'Error',
};

export function AgentStatus() {
  const { data: status, isLoading } = useQuery<AgentStatusType>({
    queryKey: ['agent-status'],
    queryFn: agentApi.getStatus,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agent Status</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColors[status.status]}`}></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {statusLabels[status.status]}
          </span>
        </div>
      </div>

      {status.currentTask && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{status.currentTask}</p>
      )}

      {status.errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{status.errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{status.risksDetected}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Risks Detected</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {status.opportunitiesIdentified}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Opportunities</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{status.plansGenerated}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Plans Generated</div>
        </div>
      </div>

      {status.lastUpdated && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Last updated: {formatDistanceToNow(new Date(status.lastUpdated), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
