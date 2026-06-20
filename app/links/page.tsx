import { PageHeader } from "@/components/dashboard/PageHeader";
import { ExternalLink } from "lucide-react";

const toolGroups = [
  {
    group: "Market Data",
    tools: [
      { name: "TradingView",     desc: "Advanced charting and technical analysis",        url: "https://tradingview.com" },
      { name: "CoinGlass",       desc: "Open interest, funding rates, liquidations",      url: "https://coinglass.com" },
      { name: "CoinGecko",       desc: "Price, market cap, and dominance data",           url: "https://coingecko.com" },
      { name: "CoinMarketCap",   desc: "Total market cap and volume tracking",            url: "https://coinmarketcap.com" },
    ],
  },
  {
    group: "On-Chain",
    tools: [
      { name: "Glassnode",         desc: "Premium on-chain analytics",                       url: "https://glassnode.com" },
      { name: "LookIntoBitcoin",   desc: "Free on-chain charts: MVRV, Puell, S2F",          url: "https://lookintobitcoin.com" },
      { name: "CoinMetrics",       desc: "Free community API for on-chain metrics",           url: "https://coinmetrics.io" },
      { name: "Into the Cryptoverse", desc: "Ben Cowen's macro cycle dashboard",             url: "https://intothecryptoverse.com" },
    ],
  },
  {
    group: "Cycle Indicators",
    tools: [
      { name: "CBBI",               desc: "Bitcoin Bull Run Index — 9 composite indicators",  url: "https://colintalkscrypto.com/cbbi/" },
      { name: "Woo Charts",         desc: "NVT, MVRV, macro oscillator, S-curve",             url: "https://woocharts.com" },
      { name: "Bitcoin Magazine Pro", desc: "Pi Cycle, SOPR, MVRV Z-Score charts",           url: "https://bitcoinmagazinepro.com" },
      { name: "Bitbo.io",           desc: "Power law, market cycles, supply in profit",       url: "https://charts.bitbo.io" },
    ],
  },
  {
    group: "Macro",
    tools: [
      { name: "FRED",              desc: "Federal Reserve economic data — free API",          url: "https://fred.stlouisfed.org" },
      { name: "CME FedWatch",      desc: "Fed rate expectations and probabilities",            url: "https://cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html" },
      { name: "Mannarino Risk",    desc: "Market risk indicator overlay",                      url: "https://www.mannarino-market-risk-indicator.com" },
      { name: "Trading Economics", desc: "Global macro data: CPI, GDP, rates",                url: "https://tradingeconomics.com" },
    ],
  },
  {
    group: "Sentiment",
    tools: [
      { name: "Alternative.me",   desc: "Bitcoin Fear & Greed Index — free API",              url: "https://alternative.me/crypto/fear-and-greed-index/" },
      { name: "Santiment",        desc: "Social volume, dev activity, network growth",        url: "https://santiment.net" },
      { name: "Google Trends",    desc: "Bitcoin search interest as sentiment proxy",          url: "https://trends.google.com/trends/explore?q=%2Fm%2F05p0rrx" },
    ],
  },
];

export default function LinksPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-10">
      <PageHeader
        title="External Tools"
        subtitle="Curated command center — data sources and reference platforms"
      />

      {toolGroups.map((group) => (
        <div key={group.group}>
          <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--sct-muted)" }}>
            {group.group}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {group.tools.map((tool) => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border p-4 flex flex-col gap-2 transition-all duration-150 group hover:border-[var(--sct-btc)]/40"
                style={{
                  backgroundColor: "var(--sct-card)",
                  borderColor: "var(--sct-border)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium" style={{ color: "var(--sct-text)" }}>
                    {tool.name}
                  </p>
                  <ExternalLink
                    size={12}
                    className="shrink-0 mt-0.5 opacity-40 group-hover:opacity-80 transition-opacity"
                    style={{ color: "var(--sct-btc)" }}
                  />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--sct-muted)" }}>
                  {tool.desc}
                </p>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

