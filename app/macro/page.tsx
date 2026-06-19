import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { InsightPanel, InsightRow } from "@/components/dashboard/InsightPanel";
import { ChartSkeleton } from "@/components/dashboard/LoadingSkeleton";

const macroStats = [
  { label: "DXY",           value: "—",   source: "FRED",  freshness: "daily" as const },
  { label: "Fed Funds Rate",value: "—%",  source: "FRED",  freshness: "weekly" as const },
  { label: "CPI YoY",       value: "—%",  source: "FRED",  freshness: "weekly" as const },
  { label: "M2 Growth",     value: "—%",  source: "FRED",  freshness: "weekly" as const },
];

const macroCharts = [
  { title: "DXY — Dollar Index",        desc: "Rising DXY = risk-off headwind for crypto." },
  { title: "Fed Funds Rate",            desc: "Higher rates = tighter liquidity conditions." },
  { title: "CPI YoY — Inflation",       desc: "Fed reacts to inflation; inflation drives rates." },
  { title: "M2 Money Supply",           desc: "Expanding M2 historically benefits BTC." },
  { title: "10Y Treasury Yield",        desc: "Rising yields compete with risk assets." },
  { title: "Real Rates (10Y - CPI)",    desc: "Negative real rates = tailwind for BTC." },
];

export default function MacroPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Macro Liquidity"
        subtitle="Global liquidity conditions and their impact on crypto"
      />

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-6">
        {macroStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Regime read */}
      <InsightPanel title="Macro Regime">
        <InsightRow label="Liquidity"    value="—" />
        <InsightRow label="Rate Trend"   value="—" />
        <InsightRow label="Dollar"       value="—" />
        <InsightRow label="M2 Trend"     value="—" />
        <InsightRow label="Macro Signal" value="—" />
      </InsightPanel>

      {/* 2×3 chart grid */}
      <div className="grid grid-cols-2 gap-6">
        {macroCharts.map((c) => (
          <div key={c.title}>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "var(--sct-muted)" }}>
                {c.title}
              </p>
              <p className="text-[11px]" style={{ color: "var(--sct-muted)" }}>FRED · Weekly</p>
            </div>
            <ChartSkeleton height="h-44" />
            <p className="mt-2 text-xs" style={{ color: "var(--sct-muted)" }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
