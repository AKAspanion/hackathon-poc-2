'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { suppliersApi, Supplier } from '@/lib/api';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';

interface SupplierDetailClientProps {
  id: string;
}

const riskLevelColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  MEDIUM:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CRITICAL:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function SupplierDetailClient({ id }: SupplierDetailClientProps) {
  useWebSocketNotifications();

  const isValidId = id && id !== 'undefined';

  const { data: supplier, isLoading } = useQuery<Supplier | null>({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getById(id),
    enabled: !!isValidId,
  });

  if (!isValidId) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <p className="text-gray-500 dark:text-gray-400">
          Supplier not found.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-32 w-full bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <p className="text-gray-500 dark:text-gray-400">
          Supplier not found.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const swarm = supplier.swarm;
  const riskSummary = supplier.riskSummary;
  const riskLevel = swarm?.riskLevel ?? 'LOW';
  const riskColor = riskLevelColors[riskLevel] ?? riskLevelColors.LOW;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
        {supplier.name}
      </h1>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Live risk, opportunities, and mitigation overview for this supplier.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Overall risk
          </div>
          {swarm ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${riskColor}`}
                >
                  {swarm.riskLevel}
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Score {swarm.finalScore}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Computed from weather, shipping, and news agents.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No risk signal yet.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Risks detected
          </div>
          {riskSummary ? (
            <>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {riskSummary.count}
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {Object.entries(riskSummary.bySeverity).map(
                  ([severity, count]) => (
                    <div key={severity}>
                      {severity.toUpperCase()}: {count}
                    </div>
                  ),
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No risks yet for this supplier.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Latest signal
          </div>
          {riskSummary?.latest ? (
            <>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {riskSummary.latest.severity.toUpperCase()}
              </div>
              <p className="text-sm text-gray-900 dark:text-white">
                {riskSummary.latest.title}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No latest risk available.
            </p>
          )}
        </div>
      </div>

      {swarm && (
        <>
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Agent swarm view
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {swarm.agents.map((agent) => (
                <div
                  key={agent.agentType}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {agent.agentType}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {agent.riskLevel} · {Math.round(agent.score)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Confidence: {(agent.confidence * 100).toFixed(0)}%
                  </div>
                  {agent.signals.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {agent.signals.slice(0, 3).map((signal) => (
                        <li
                          key={signal}
                          className="text-xs text-gray-600 dark:text-gray-300"
                        >
                          • {signal}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {swarm.mitigationPlan.length > 0 && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Mitigation plan
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                {swarm.mitigationPlan.map((step, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}

