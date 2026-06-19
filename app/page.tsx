import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { InsightPanel, InsightRow } from "@/components/dashboard/InsightPanel";
import { ChartSkeleton, StatCardSkeleton } from "@/components/dashboard/LoadingSkeleton";

export default function OverviewPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Overview"
        subtitle="Bitcoin & Ethereum macro cycle dashboard"
        regime="neutral"
      />

      {/* Row 1 — Key stats */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          label="Bitcoin"
          value="$—"
          sub="Loading…"
          accent="var(--sct-btc)"
          freshness="cached"
          source="CoinGecko"
        />
        <StatCard
          label="Ethereum"
          value="$—"
          sub="Loading…"
          accent="var(--sct-eth)"
          freshness="cached"
          source="CoinGecko"
        />
        <StatCard
          label="Fear & Greed"
          value="—"
          sub="Loading…"
          freshness="daily"
          source="Alternative.me"
        />
        <StatCard
          label="BTC Dominance"
          value="—%"
          sub="Loading…"
          freshness="daily"
          source="CoinGecko"
        />
      </div>

      {/* Row 2 — Cycle score + market read */}
      <div className="grid grid-cols-3 gap-6">
        <div
          className="col-span-2 rounded-xl border p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]"
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
        >
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--sct-muted)" }}>
            Skyline Cycle Score
          </p>
          <div className="text-7xl font-mono font-bold" style={{ color: "var(--sct-text)" }}>
            —
          </div>
          <div className="w-full max-w-sm h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--sct-border)" }}>
            <div className="h-full w-0 rounded-full transition-all duration-700" style={{ backgroundColor: "var(--sct-blue)" }} />
          </div>
          <p className="text-sm text-center" style={{ color: "var(--sct-muted)" }}>
            Score wires up in Phase 2 — data layer coming next
          </p>
        </div>

        <InsightPanel title="Current Market Read">
          <InsightRow label="Cycle" value="—" />
          <InsightRow label="Sentiment" value="—" />
          <InsightRow label="Macro" value="—" />
          <InsightRow label="BTC Trend" value="—" />
          <InsightRow label="ETH Trend" value="—" />
          <p className="mt-4 text-xs leading-relaxed opacity-60">
            Interpretation loads once data layer is active.
          </p>
        </InsightPanel>
      </div>

      {/* Row 3 — Sub-scores */}
      <div className="grid grid-cols-4 gap-6">
        {["On-Chain Score", "Macro Score", "Price Trend", "Sentiment Score"].map((label) => (
          <StatCardSkeleton key={label} />
        ))}
      </div>

      {/* Row 4 — BTC chart placeholder */}
      <div>
        <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: "var(--sct-muted)" }}>
          BTC / USD — 365 Days
        </p>
        <ChartSkeleton height="h-80" />
      </div>
    </div>
  );
}
