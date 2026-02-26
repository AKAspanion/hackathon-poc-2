"use client";

import type { ShipmentWeatherExposureResponse, RiskLevel } from "@/lib/types";
import { RISK_LEVEL_COLORS, RISK_LEVEL_BAR_COLORS } from "@/lib/constants";

function formatLevel(level: RiskLevel) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

interface ShipmentExposureSummaryProps {
  data: ShipmentWeatherExposureResponse;
  onCopyPayload?: () => void;
  payloadCopied?: boolean;
}

export function ShipmentExposureSummary({
  data,
  onCopyPayload,
  payloadCopied,
}: ShipmentExposureSummaryProps) {
  const colors = RISK_LEVEL_COLORS[data.overall_exposure_level] ?? RISK_LEVEL_COLORS.low;
  const barColor = RISK_LEVEL_BAR_COLORS[data.overall_exposure_level] ?? RISK_LEVEL_BAR_COLORS.low;
  const exp = data.risk_analysis_payload?.exposure_summary as Record<string, unknown> ?? {};

  return (
    <div className="rounded-2xl border border-light-gray bg-white p-5 shadow-sm space-y-4">
      {/* Route header */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-[16px] font-semibold text-dark-gray">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[13px] text-blue-700 border border-blue-200">
            {data.supplier_city}
          </span>
          <span className="text-medium-gray">→</span>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-[13px] text-purple-700 border border-purple-200">
            {data.oem_city}
          </span>
        </div>
        <span className="text-[13px] text-medium-gray">
          {data.transit_days} days · starts {data.shipment_start_date}
        </span>
      </div>

      {/* Overall score */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-light-gray p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-medium-gray">
            Exposure Level
          </div>
          <div className={`mt-1 text-[16px] font-bold ${colors.text}`}>
            {formatLevel(data.overall_exposure_level)}
          </div>
        </div>
        <div className="rounded-xl border border-light-gray p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-medium-gray">
            Exposure Score
          </div>
          <div className="mt-1 text-[16px] font-bold text-dark-gray">
            {data.overall_exposure_score.toFixed(1)}/100
          </div>
        </div>
        <div className="rounded-xl border border-light-gray p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-medium-gray">
            Peak Risk Day
          </div>
          <div className="mt-1 text-[16px] font-bold text-dark-gray">
            Day {String(exp.peak_risk_day ?? "—")}
          </div>
          <div className="text-[11px] text-medium-gray">{String(exp.peak_risk_date ?? "")}</div>
        </div>
        <div className="rounded-xl border border-light-gray p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-medium-gray">
            High-Risk Days
          </div>
          <div className="mt-1 text-[16px] font-bold text-dark-gray">
            {String(exp.high_risk_day_count ?? 0)} / {data.transit_days}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-light-gray/50">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(8, Math.min(100, data.overall_exposure_score))}%` }}
        />
      </div>

      {/* Agent summary */}
      {data.agent_summary && (
        <div className="rounded-xl border border-cyan-blue/40 bg-cyan-blue/5 p-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-dark">
            Agent Summary
          </div>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-dark-gray">
            {data.agent_summary}
          </p>
        </div>
      )}

      {/* Primary concerns & actions */}
      {(data.risk_analysis_payload?.primary_concerns as string[] | undefined)?.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-medium-gray">
              Key Concerns
            </div>
            <ul className="space-y-1">
              {(data.risk_analysis_payload.primary_concerns as string[]).slice(0, 4).map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[13px] text-dark-gray">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-medium-gray">
              Recommended Actions
            </div>
            <ul className="space-y-1">
              {(data.risk_analysis_payload.recommended_actions as string[]).slice(0, 4).map((a, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[13px] text-dark-gray">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Risk Analysis Payload Copy */}
      <div className="rounded-xl border border-light-gray bg-off-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[12px] font-semibold text-dark-gray">
              Risk Analysis Agent Payload
            </div>
            <div className="text-[11px] text-medium-gray">
              Structured JSON ready for downstream Risk Analysis Agent consumption
            </div>
          </div>
          {onCopyPayload && (
            <button
              onClick={onCopyPayload}
              className="shrink-0 rounded-lg border border-primary-light/40 bg-white px-3 py-1.5 text-[12px] font-medium text-primary-dark transition hover:bg-sky-blue/10"
            >
              {payloadCopied ? "✓ Copied!" : "Copy JSON"}
            </button>
          )}
        </div>
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-white p-3 text-[11px] text-dark-gray leading-relaxed border border-light-gray">
          {JSON.stringify(data.risk_analysis_payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
