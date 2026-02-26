"use client";

interface AgentSummaryCardProps {
  summary: string;
}

export function AgentSummaryCard({ summary }: AgentSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-cyan-blue/40 bg-cyan-blue/5 p-5">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-primary-dark">
        Agent summary
      </div>
      <p className="whitespace-pre-line text-[16px] leading-relaxed text-dark-gray">
        {summary}
      </p>
    </div>
  );
}
