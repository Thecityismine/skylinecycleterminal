import { PageHeader } from "@/components/dashboard/PageHeader";
import { ChartSkeleton } from "@/components/dashboard/LoadingSkeleton";

export default function PricePage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Price Structure"
        subtitle="BTC & ETH technical analysis with cycle overlays"
      />

      {/* Asset tabs placeholder */}
      <div className="flex gap-2">
        {["BTC / USD", "ETH / USD"].map((tab, i) => (
          <button
            key={tab}
            className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
            style={{
              backgroundColor: i === 0 ? "var(--sct-card)" : "transparent",
              borderColor: i === 0 ? "var(--sct-btc)" : "var(--sct-border)",
              color: i === 0 ? "var(--sct-btc)" : "var(--sct-muted)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Timeframe + overlay controls */}
      <div className="flex items-center gap-6">
        <div className="flex gap-2">
          {["1Y", "2Y", "4Y", "All"].map((tf) => (
            <button
              key={tf}
              className="px-3 py-1 rounded text-xs font-mono border"
              style={{ borderColor: "var(--sct-border)", color: "var(--sct-muted)", backgroundColor: "transparent" }}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: "var(--sct-border)" }} />
        <div className="flex gap-2">
          {["200 DMA", "2Y MA", "Log Regression", "Halvings"].map((ov) => (
            <button
              key={ov}
              className="px-3 py-1 rounded text-xs border"
              style={{ borderColor: "var(--sct-border)", color: "var(--sct-muted)", backgroundColor: "transparent" }}
            >
              {ov}
            </button>
          ))}
        </div>
      </div>

      {/* Main chart */}
      <ChartSkeleton height="h-[420px]" />

      {/* RSI + MACD sub-panels */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "var(--sct-muted)" }}>RSI (14)</p>
          <ChartSkeleton height="h-32" />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: "var(--sct-muted)" }}>MACD</p>
          <ChartSkeleton height="h-32" />
        </div>
      </div>
    </div>
  );
}
