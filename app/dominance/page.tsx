import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { InsightPanel, InsightRow } from "@/components/dashboard/InsightPanel";

export default function DominancePage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Market Structure"
        subtitle="BTC & ETH dominance, total crypto market cap and trendline"
      />

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-6">
        <StatCard label="BTC Dominance"        value="—%"   source="CoinGecko" freshness="daily" accent="var(--sct-btc)" />
        <StatCard label="ETH Dominance"        value="—%"   source="CoinGecko" freshness="daily" accent="var(--sct-eth)" />
        <StatCard label="Total Market Cap"     value="$—T"  source="CoinGecko" freshness="daily" />
      </div>

      {/* Dominance interpretation */}
      <InsightPanel title="Structure Read">
        <InsightRow label="BTC Dominance Signal" value="—" />
        <InsightRow label="ETH vs BTC"           value="—" />
        <InsightRow label="Altcoin Risk"          value="—" />
        <InsightRow label="Market Phase"          value="—" />
      </InsightPanel>

      {/* Charts 3-col */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { title: "BTC Dominance",          desc: "Rising BTC.D = capital rotating to Bitcoin safety." },
          { title: "ETH Dominance",          desc: "ETH.D rising after BTC.D peaks signals alt season." },
          { title: "Total Market Cap",        desc: "Log regression shows market vs fair value trendline." },
        ].map((c) => (
          <div key={c.title}>
            <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "var(--sct-muted)" }}>
              {c.title}
            </p>
            <ChartSkeleton height="h-48" />
            <p className="mt-2 text-xs" style={{ color: "var(--sct-muted)" }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
