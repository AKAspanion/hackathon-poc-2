'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { suppliersApi, Supplier } from '@/lib/api';
import { AppNav } from '@/components/AppNav';
import { useAuth } from '@/lib/auth-context';
import { formatDistanceToNow } from 'date-fns';

const severityBadgeClasses: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function RiskSummaryCell({ supplier }: { supplier: Supplier }) {
  const { riskSummary } = supplier;
  if (riskSummary.count === 0) {
    return (
      <span className="text-gray-500 dark:text-gray-400 text-sm">No risks</span>
    );
  }

  const severities = Object.entries(riskSummary.bySeverity).filter(
    ([_, n]) => n > 0,
  );

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {riskSummary.count} risk{riskSummary.count !== 1 ? 's' : ''}
      </span>
      <div className="flex flex-wrap gap-1">
        {severities.map(([sev, count]) => (
          <span
            key={sev}
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityBadgeClasses[sev] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
          >
            {sev}: {count}
          </span>
        ))}
      </div>
      {riskSummary.latest && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[200px]" title={riskSummary.latest.title}>
          Latest: {riskSummary.latest.title}
        </p>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const { isLoggedIn, hydrated } = useAuth();

  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      router.replace('/login');
    }
  }, [hydrated, isLoggedIn, router]);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll(),
    enabled: hydrated && isLoggedIn === true,
  });

  if (!hydrated || !isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Suppliers
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All suppliers and AI-generated risk data
              </p>
            </div>
            <AppNav />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Risk data is correlated by the Supervisor and SupplierCorrelate agents from weather, news, and other sources.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-12">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          ) : !suppliers || suppliers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No suppliers yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Supplier
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Commodities
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Risk data (AI)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {supplier.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {[supplier.location, supplier.city, supplier.country, supplier.region]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={supplier.commodities ?? undefined}>
                        {supplier.commodities || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <RiskSummaryCell supplier={supplier} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(supplier.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
