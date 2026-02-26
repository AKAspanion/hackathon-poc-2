'use client';

import { useEffect, useState } from 'react';
import {
  shippingRiskApi,
  type ShippingSupplierItem,
  type ShippingRiskResult,
  type TrackingActivity,
} from '@/lib/api';

const AWB_BY_SUPPLIER_NAME: Record<string, string> = {
  'Chennai Chip Supplier': 'AWB-CHEN-001',
  'Mumbai Electronics Ltd': 'AWB-MUM-002',
  'Delhi Precision Parts': 'AWB-DEL-003',
  'Pune Motor Components': 'AWB-PUN-004',
  'Kolkata Steel Supplier': 'AWB-KOL-005',
};

function riskLevelClass(level: string): string {
  const l = (level || '').toLowerCase();
  if (l === 'low') return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400';
  if (l === 'medium') return 'border-amber-500/60 bg-amber-500/10 text-amber-400';
  if (l === 'high' || l === 'critical') return 'border-red-500/60 bg-red-500/10 text-red-400';
  return 'border-gray-500/60 bg-gray-500/10 text-gray-400';
}

export function ShippingRiskDashboard() {
  const [suppliers, setSuppliers] = useState<ShippingSupplierItem[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('Select a supplier to run the Shipment Agent.');
  const [statusMeta, setStatusMeta] = useState('Idle');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ShippingRiskResult | null>(null);
  const [timeline, setTimeline] = useState<TrackingActivity[]>([]);
  const [timelineAwb, setTimelineAwb] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoadingSuppliers(true);
    shippingRiskApi
      .getSuppliers()
      .then((data) => {
        if (!cancelled) setSuppliers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setSuppliers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuppliers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRunRisk = async (id: number, name: string) => {
    if (running) return;
    setRunning(true);
    setStatusText(`Running Shipment Agent for ${name}...`);
    setStatusMeta('Running');
    setResult(null);
    try {
      const data = await shippingRiskApi.runRisk(id);
      setResult(data);
      setStatusText(`Shipment Agent complete for ${name}.`);
      setStatusMeta('OK');
    } catch {
      setStatusText('Failed to run Shipment Agent.');
      setStatusMeta('Error');
    } finally {
      setRunning(false);
    }
  };

  const handleViewTracking = async (name: string) => {
    const awb = AWB_BY_SUPPLIER_NAME[name];
    setTimelineAwb(awb ? `AWB: ${awb}` : 'No AWB mapping');
    setTimeline([]);
    if (!awb) return;
    try {
      const data = await shippingRiskApi.getTracking(awb);
      const activities =
        data?.tracking_data?.shipment_track_activities ?? [];
      setTimeline(
        [...activities].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      );
    } catch {
      setTimeline([]);
    }
  };

  const scoreToDeg = (score: number) =>
    Math.max(0, Math.min(1, score)) * 360;

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <section className="rounded-2xl border border-gray-700/80 bg-gray-800/90 p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
            Suppliers
          </h2>
          <span className="rounded-full border border-gray-600 bg-gray-900/90 px-2 py-0.5 text-xs text-gray-400">
            Live data
          </span>
        </div>
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {loadingSuppliers ? (
            <p className="text-sm text-gray-400">Loading suppliers...</p>
          ) : suppliers.length === 0 ? (
            <p className="text-sm text-gray-400">
              No suppliers found. Seed script will populate on backend startup.
            </p>
          ) : (
            suppliers.map((s) => (
              <div
                key={s.id}
                className={`mb-2 cursor-pointer rounded-xl border p-3 transition hover:border-indigo-500/50 hover:bg-gray-700/30 ${
                  selectedId === s.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-600 bg-gray-900/50'
                }`}
                onClick={() => setSelectedId(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === 'Enter' && setSelectedId(s.id)
                }
              >
                <div className="mb-1 flex justify-between gap-2">
                  <span className="text-sm font-medium text-white">
                    {s.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {s.material_name}
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap gap-1 text-xs text-gray-400">
                  <span>
                    {s.location_city ?? '?'} → {s.destination_city ?? 'Bangalore'}
                  </span>
                  <span>{s.shipping_mode}</span>
                  <span>{s.distance_km ?? '?'} km</span>
                  <span>ETA ~{s.avg_transit_days ?? '?'} days</span>
                </div>
                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    disabled={running}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunRisk(s.id, s.name);
                    }}
                    className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Run Shipment Agent
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewTracking(s.name);
                    }}
                    className="rounded-full border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-700"
                  >
                    View Tracking
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col rounded-2xl border border-gray-700/80 bg-gray-800/90 p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
            Risk & Tracking
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
            <span>{statusMeta}</span>
          </div>
        </div>
        <p className="mb-4 text-sm text-gray-400">{statusText}</p>

        <div className="grid flex-1 grid-rows-[auto_auto_1fr] gap-4">
          {result && (
            <div className="flex flex-wrap items-center gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-indigo-500 bg-gray-900"
                style={{
                  background: `conic-gradient(#6366f1 0deg, #6366f1 ${scoreToDeg(result.shipping_risk_score)}deg, rgba(31,41,55,1) ${scoreToDeg(result.shipping_risk_score)}deg)`,
                }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900">
                  <div className="text-center">
                    <span className="block text-lg font-semibold text-white">
                      {(result.shipping_risk_score * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-gray-400">risk</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span
                  className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs ${riskLevelClass(result.risk_level)}`}
                >
                  Risk level: {result.risk_level || 'Medium'}
                </span>
                <div className="flex flex-wrap gap-1 text-xs text-gray-400">
                  <span className="rounded-full border border-gray-600 bg-gray-900 px-2 py-0.5">
                    Delay: {result.delay_risk_score != null ? `${(result.delay_risk_score * 100).toFixed(0)}%` : 'n/a'}
                  </span>
                  <span className="rounded-full border border-gray-600 bg-gray-900 px-2 py-0.5">
                    Stagnation: {result.stagnation_risk_score != null ? `${(result.stagnation_risk_score * 100).toFixed(0)}%` : 'n/a'}
                  </span>
                  <span className="rounded-full border border-gray-600 bg-gray-900 px-2 py-0.5">
                    Velocity: {result.velocity_risk_score != null ? `${(result.velocity_risk_score * 100).toFixed(0)}%` : 'n/a'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  Delay probability: {(result.delay_probability * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {result && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <strong className="mb-2 block text-xs uppercase tracking-wider text-gray-400">
                  Risk factors
                </strong>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-gray-300">
                  {(result.risk_factors || []).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong className="mb-2 block text-xs uppercase tracking-wider text-gray-400">
                  Recommended actions
                </strong>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-gray-300">
                  {(result.recommended_actions || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <strong className="text-xs uppercase tracking-wider text-gray-400">
                  Tracking timeline
                </strong>
                <span className="text-xs text-gray-400">{timelineAwb}</span>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-600 bg-gray-900/80 p-2">
                {timeline.length === 0 ? (
                  <p className="text-sm text-gray-500">No tracking data yet.</p>
                ) : (
                  timeline.map((act, i) => (
                    <div
                      key={i}
                      className="mb-3 flex gap-2 text-sm"
                    >
                      <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
                      <div>
                        <div>
                          <strong>{act.status}</strong> · {act.activity}
                        </div>
                        <div className="text-xs text-gray-500">
                          {act.location}
                        </div>
                        <span className="text-xs text-gray-500">
                          {act.date}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <strong className="mb-1 block text-xs uppercase tracking-wider text-gray-400">
                Shipment metadata (JSON)
              </strong>
              <pre className="max-h-52 overflow-auto rounded-lg border border-gray-600 bg-gray-900/80 p-2 text-xs text-gray-300">
                {result?.shipment_metadata
                  ? JSON.stringify(result.shipment_metadata, null, 2)
                  : 'No shipment metadata from agent.'}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
