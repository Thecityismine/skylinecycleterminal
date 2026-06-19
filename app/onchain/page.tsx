import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartSkeleton } from "@/components/dashboard/LoadingSkeleton";

const metrics = [
  { label: "MVRV Z-Score",     value: "—",    source: "CoinMetrics",   freshness: "daily" as const },
  { label: "Puell Multiple",   value: "—",    source: "CoinMetrics",   freshness: "daily" as const },
  { label: "NVT Signal",       value: "—",    source: "CoinMetrics",   freshness: "daily" as const },
  { label: "Active Addresses", value: "—",    source: "CoinMetrics",   freshness: "daily" as const },
];

const charts = [
  { title: "MVRV Z-Score",     desc: "Market value vs realized value. High = overheated. Low = undervalued." },
  { title: "Puell Multiple",   desc: "Daily miner revenue vs 365d MA. Spikes at cycle tops." },
  { title: "NVT Signal",       desc: "Market cap vs transaction volume. High NVT = overvalued network." },
  { title: "Active Addresses", desc: "30d MA of daily active addresses. Rising = growing adoption." },
];

export default function OnChainPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="On-Chain Metrics"
        subtitle="Network health and investor behavior signals"
      />

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-6">
        {metrics.map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      {/* 2×2 chart grid */}
      <div className="grid grid-cols-2 gap-6">
        {charts.map((c) => (
          <div key={c.title}>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "var(--sct-muted)" }}>
                {c.title}
              </p>
              <p className="text-[11px]" style={{ color: "var(--sct-muted)" }}>CoinMetrics · Daily</p>
            </div>
            <ChartSkeleton height="h-52" />
            <p className="mt-2 text-xs" style={{ color: "var(--sct-muted)" }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
