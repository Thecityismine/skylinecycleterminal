import { PageHeader } from "@/components/dashboard/PageHeader";

const indicators = [
  {
    name: "Pi Cycle Top Indicator",
    formula: "111-day MA crosses above 2× 350-day MA",
    signal: "Historically marks cycle tops within days",
    source: "CoinGecko price data (calculated)",
    weight: "12.5%",
  },
  {
    name: "MVRV Z-Score",
    formula: "(Market Cap − Realized Cap) / Std Dev of Market Cap",
    signal: "High Z-Score = overheated. Negative = deep value.",
    source: "CoinMetrics Community API (CapMVRVCur)",
    weight: "12.5%",
  },
  {
    name: "Puell Multiple",
    formula: "Daily miner issuance USD / 365-day MA of issuance USD",
    signal: "Spikes mark tops; deep lows mark bottoms",
    source: "CoinMetrics Community API (IssTotUSD)",
    weight: "12.5%",
  },
  {
    name: "2-Year MA Multiplier",
    formula: "BTC price / 730-day MA of BTC price",
    signal: "Price 5× above 2Y MA = overheated. Below = buy zone.",
    source: "CoinGecko price data (calculated)",
    weight: "12.5%",
  },
  {
    name: "Log Regression Position",
    formula: "Price position within logarithmic regression channel",
    signal: "Top band = overvalued. Bottom band = undervalued.",
    source: "CoinGecko price history (calculated)",
    weight: "12.5%",
  },
  {
    name: "NVT Signal",
    formula: "Market Cap / 90-day MA of Transaction Volume",
    signal: "High NVT = overvalued network. Low = undervalued.",
    source: "CoinMetrics Community API (TxCnt + CapMrktCurUSD)",
    weight: "12.5%",
  },
  {
    name: "Fear & Greed Index",
    formula: "Composite of volatility, momentum, social, surveys",
    signal: "Extreme fear = accumulation opportunity historically",
    source: "Alternative.me free API",
    weight: "12.5%",
  },
  {
    name: "Active Addresses Trend",
    formula: "30d MA of daily active addresses vs 365d MA",
    signal: "Rising trend = growing network = bull signal",
    source: "CoinMetrics Community API (AdrActCnt)",
    weight: "12.5%",
  },
];

export default function MethodologyPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Methodology"
        subtitle="How the Skyline Cycle Score is calculated"
      />

      {/* Score overview */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
      >
        <h2 className="text-base font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
          Composite Scoring
        </h2>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--sct-secondary)" }}>
          The Skyline Cycle Score combines 8 on-chain, technical, and sentiment indicators.
          Each metric is independently normalized to a 0–100 scale based on its historical range.
          The composite score is the equal-weighted average of all 8.
        </p>
        <div className="flex gap-6">
          {[
            { range: "0–25",   label: "Accumulate",      color: "var(--sct-blue)" },
            { range: "25–50",  label: "Build / Hold",    color: "var(--sct-green)" },
            { range: "50–75",  label: "Caution",         color: "var(--sct-amber)" },
            { range: "75–100", label: "Distribution Risk", color: "var(--sct-red)" },
          ].map((band) => (
            <div key={band.range} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: band.color }} />
              <span className="text-sm" style={{ color: "var(--sct-secondary)" }}>
                {band.range} — {band.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Indicator table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--sct-border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--sct-panel)" }}>
              {["Indicator", "Formula / Signal", "Data Source", "Weight"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  style={{ color: "var(--sct-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {indicators.map((ind, i) => (
              <tr
                key={ind.name}
                style={{
                  backgroundColor: i % 2 === 0 ? "var(--sct-card)" : "var(--sct-panel)",
                  borderTop: `1px solid var(--sct-border)`,
                }}
              >
                <td className="px-5 py-4 font-medium" style={{ color: "var(--sct-text)" }}>
                  {ind.name}
                </td>
                <td className="px-5 py-4" style={{ color: "var(--sct-secondary)" }}>
                  <p className="text-xs">{ind.formula}</p>
                  <p className="text-[11px] mt-1 opacity-70">{ind.signal}</p>
                </td>
                <td className="px-5 py-4 text-xs" style={{ color: "var(--sct-muted)" }}>
                  {ind.source}
                </td>
                <td className="px-5 py-4 font-mono text-xs" style={{ color: "var(--sct-btc)" }}>
                  {ind.weight}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
      >
        <p className="text-xs leading-relaxed" style={{ color: "var(--sct-muted)" }}>
          <strong style={{ color: "var(--sct-secondary)" }}>Disclaimer:</strong>{" "}
          The Skyline Cycle Score is a personal analytical tool, not financial advice.
          No indicator is predictive with certainty. Higher scores suggest elevated cycle risk;
          they do not guarantee a top. Lower scores suggest accumulation conditions; they do not
          guarantee a bottom. Use this alongside your own research and risk management.
        </p>
      </div>
    </div>
  );
}
