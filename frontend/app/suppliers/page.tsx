'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { suppliersApi, Supplier, SupplierSwarmSummary } from '@/lib/api';
import { AppNav } from '@/components/AppNav';
import { useAuth } from '@/lib/auth-context';
import { formatDistanceToNow } from 'date-fns';

const severityBadgeClasses: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const swarmLevelBadgeClasses: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
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
        <p
          className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[220px]"
          title={riskSummary.latest.title}
        >
          Latest: {riskSummary.latest.title}
        </p>
      )}
      <SwarmSummary swarm={supplier.swarm ?? null} />
    </div>
  );
}

function SwarmSummary({ swarm }: { swarm: SupplierSwarmSummary | null }) {
  if (!swarm) {
    return null;
  }

  const primaryAgent = swarm.agents.find((a) => a.riskLevel === swarm.riskLevel) ?? swarm.agents[0];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${swarmLevelBadgeClasses[swarm.riskLevel] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
        >
          Swarm risk: {swarm.riskLevel}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Score: {swarm.finalScore}
        </span>
      </div>
      {primaryAgent && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[260px]">
          Dominant driver: {primaryAgent.agentType}
          {swarm.topDrivers && swarm.topDrivers.length > 0 ? ` — ${swarm.topDrivers[0]}` : ''}
        </p>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const { isLoggedIn, hydrated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: suppliersApi.uploadCsv,
    onSuccess: (result) => {
      setUploadError(null);
      const hasErrors = result.errors && result.errors.length > 0;
      const baseMessage = `Imported ${result.created} supplier${result.created === 1 ? '' : 's'}.`;
      const errorSuffix = hasErrors
        ? ` ${result.errors.length} row${result.errors.length === 1 ? '' : 's'} had issues.`
        : '';
      setUploadSuccess(baseMessage + errorSuffix);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: () => {
      setUploadSuccess(null);
      setUploadError('Failed to upload CSV. Please try again.');
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUploadClick = () => {
    if (!selectedFile) {
      setUploadError('Please select a CSV file first.');
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    uploadMutation.mutate(selectedFile);
  };

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
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400 lg:max-w-xl">
              Risk data is generated by the Orchestration Agent coordinating Weather, Shipment, News, and Risk Analysis agents.
            </p>

            <div className="w-full lg:w-auto">
              <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 sm:px-5 sm:py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Onboard suppliers via CSV
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Upload a CSV file with supplier details to quickly populate your watchlist. Required columns should match the backend schema.
                    </p>
                    {selectedFile && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                        Selected file{' '}
                        <span className="font-medium break-all">
                          {selectedFile.name}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {selectedFile ? 'Change CSV' : 'Choose CSV'}
                    </label>
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      disabled={!selectedFile || uploadMutation.isPending}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploadMutation.isPending ? 'Uploading…' : 'Upload CSV'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {uploadSuccess && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
              {uploadSuccess}
            </div>
          )}

          {uploadError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-300">
              {uploadError}
            </div>
          )}
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
                      <td
                        className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate"
                        title={supplier.commodities ?? undefined}
                      >
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
