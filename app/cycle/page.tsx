import { PageHeader } from "@/components/dashboard/PageHeader";
import { InsightPanel, InsightRow } from "@/components/dashboard/InsightPanel";
import { ChartSkeleton, StatCardSkeleton } from "@/components/dashboard/LoadingSkeleton";

const indicators = [
  { name: "Pi Cycle Top",       source: "CoinGecko (calc)" },
  { name: "MVRV Z-Score",       source: "CoinMetrics" },
  { name: "Puell Multiple",     source: "CoinMetrics" },
  { name: "2Y MA Multiplier",   source: "CoinGecko (calc)" },
  { name: "Log Regression",     source: "CoinGecko (calc)" },
  { name: "NVT Signal",         source: "CoinMetrics" },
  { name: "Fear & Greed",       source: "Alternative.me" },
  { name: "Active Addresses",   source: "CoinMetrics" },
];

export default function CyclePage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Skyline Cycle Score"
        subtitle="Composite 0–100 cycle position indicator"
        regime="neutral"
      />

      {/* Gauge placeholder */}
      <div
        className="rounded-xl border p-10 flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
      >
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--sct-muted)" }}>
          Skyline Cycle Score
        </p>
        <div className="text-8xl font-mono font-bold" style={{ color: "var(--sct-text)" }}>
          —
        </div>
        <p className="text-sm tracking-wider" style={{ color: "var(--sct-secondary)" }}>
          SIGNAL: —
        </p>

        {/* Score band reference */}
        <div className="flex gap-6 mt-2">
          {[
            { range: "0–25",   label: "Accumulate",  color: "var(--sct-blue)" },
            { range: "25–50",  label: "Hold / Build", color: "var(--sct-green)" },
            { range: "50–75",  label: "Caution",      color: "var(--sct-amber)" },
            { range: "75–100", label: "Distribution", color: "var(--sct-red)" },
          ].map((band) => (
            <div key={band.range} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: band.color }} />
              <span className="text-xs font-mono" style={{ color: "var(--sct-muted)" }}>
                {band.range} {band.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Indicator breakdown + historical chart */}
      <div className="grid grid-cols-5 gap-6">
        {/* Breakdown — 2 cols */}
        <div
          className="col-span-2 rounded-xl border p-5"
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: "var(--sct-muted)" }}>
            Indicator Breakdown
          </p>
          <div className="space-y-3">
            {indicators.map((ind) => (
              <div key={ind.name}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs" style={{ color: "var(--sct-secondary)" }}>{ind.name}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--sct-muted)" }}>— / 100</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--sct-border)" }}>
                  <div className="h-full w-0 rounded-full" style={{ backgroundColor: "var(--sct-blue)" }} />
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--sct-muted)" }}>{ind.source}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Historical score chart — 3 cols */}
        <div className="col-span-3 flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "var(--sct-muted)" }}>
              Historical Score — 4 Year
            </p>
            <ChartSkeleton height="h-64" />
          </div>
          <InsightPanel title="Score Methodology">
            <p className="text-xs leading-relaxed">
              Each of 8 indicators is normalized to 0–100 based on its historical range.
              Higher score = higher cycle risk. Lower score = stronger accumulation conditions.
              Scores are averaged with equal weighting in v1.
            </p>
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
