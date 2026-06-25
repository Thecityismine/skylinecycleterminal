import { fetchDXYHistory } from '@/lib/api/fred';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { computeDxyTrend, REGIME_COLOR, REGIME_LABEL } from '@/lib/indicators/dxyTrend';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { DXYChartSection } from '@/components/charts/DXYChartSection';

export const revalidate = 86400;

export default async function DXYPage() {
  const [dxyData, btcPrices] = await Promise.all([
    fetchDXYHistory(),
    fetchBTCDailyPrice('2010-01-01'),
  ]);

  const { chartData, zones, current } = computeDxyTrend(dxyData, btcPrices);

  const regimeColor = REGIME_COLOR[current.trendRegime];

  const btcContextColor = current.btcContext === 'headwind' ? '#F85149'
    : current.btcContext === 'tailwind' ? '#35D07F'
    : '#EAB84D';

  const scoreColor = current.trendScore >= 75 ? '#F85149'
    : current.trendScore >= 50 ? '#EAB84D'
    : '#35D07F';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="DXY — U.S. Dollar Index"
        subtitle="Dollar strength, macro liquidity pressure, and long-term trend structure"
      />

      {/* 4 Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current DXY"
          value={current.dxy.toFixed(1)}
          sub="DTWEXBGS broad index"
          accent={regimeColor}
          freshness="daily"
        />
        <StatCard
          label="90D Change"
          value={current.change90d !== null ? `${current.change90d >= 0 ? '+' : ''}${current.change90d.toFixed(1)}%` : '—'}
          sub="vs 13 weeks ago"
          accent={current.change90d !== null ? (current.change90d < 0 ? '#35D07F' : '#F85149') : 'var(--sct-muted)'}
          freshness="daily"
        />
        <StatCard
          label="Trend Regime"
          value={REGIME_LABEL[current.trendRegime]}
          sub="vs 200-week moving average"
          accent={regimeColor}
          freshness="daily"
        />
        <StatCard
          label="BTC Context"
          value={current.btcContext === 'headwind' ? 'Macro Headwind' : current.btcContext === 'tailwind' ? 'Macro Tailwind' : 'Neutral'}
          sub={`Trend Score: ${current.trendScore} / 100`}
          accent={btcContextColor}
          freshness="daily"
        />
      </div>

      {/* Main chart section */}
      <DXYChartSection chartData={chartData} zones={zones} />

      {/* Two panels side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trend Score Panel */}
        <div
          className="rounded-lg border p-4 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>DXY Trend Score</h2>
            <span className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>
              {current.trendScore}
              <span className="text-sm font-normal" style={{ color: 'var(--sct-muted)' }}> / 100</span>
            </span>
          </div>
          {/* Score bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
            <div style={{ width: `${current.trendScore}%`, height: '100%', background: scoreColor, borderRadius: 999 }} />
          </div>
          {/* Component rows */}
          {[
            { label: 'Price vs 50W MA',   weight: '30%' },
            { label: 'Price vs 200W MA',  weight: '25%' },
            { label: '50W MA Slope',       weight: '20%' },
            { label: '90D Return',         weight: '15%' },
            { label: 'DXY Level vs 100',  weight: '10%' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--sct-muted)' }}>{row.label}</span>
              <span className="font-mono" style={{ color: 'var(--sct-muted)' }}>{row.weight}</span>
            </div>
          ))}
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            Score above 75 = Strong Dollar (BTC headwind) · below 50 = Weak/Neutral Dollar
          </p>
        </div>

        {/* BTC Macro Context Panel */}
        <div
          className="rounded-lg border p-4 space-y-3"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor: btcContextColor + '55',
            borderLeftWidth: 4,
          }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>BTC Macro Context</h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            {current.btcContext === 'headwind'
              ? 'DXY is strengthening and trading above its 200-week moving average. Historically, a rising dollar tightens global liquidity and acts as a headwind for Bitcoin and risk assets.'
              : current.btcContext === 'tailwind'
              ? 'DXY is weakening and trading below its 200-week moving average. A weaker dollar tends to support global liquidity and has historically been a tailwind for Bitcoin.'
              : 'DXY is consolidating near its long-term moving averages. The dollar is neither clearly strengthening nor weakening, providing a mixed macro backdrop for Bitcoin.'}
          </p>

          {/* Correlation */}
          <div className="rounded p-3" style={{ backgroundColor: 'var(--sct-panel)' }}>
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              BTC vs DXY — 26W Rolling Correlation
            </p>
            <p
              className="text-xl font-bold font-mono mt-1"
              style={{
                color: current.rollingCorr !== null
                  ? (current.rollingCorr < -0.2 ? '#35D07F' : current.rollingCorr > 0.2 ? '#F85149' : 'var(--sct-text)')
                  : 'var(--sct-muted)',
              }}
            >
              {current.rollingCorr !== null ? current.rollingCorr.toFixed(2) : '—'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
              {current.rollingCorr === null ? 'Insufficient data'
                : current.rollingCorr < -0.5 ? 'Strong inverse relationship'
                : current.rollingCorr < -0.2 ? 'Moderate inverse relationship'
                : current.rollingCorr < 0.2  ? 'Weak / uncorrelated'
                : 'Positive relationship (atypical)'}
            </p>
          </div>
        </div>
      </div>

      <InsightPanel title="Methodology">
        <InsightRow
          label="Data Source"
          value="FRED DTWEXBGS — Nominal Broad U.S. Dollar Index (Goods). Weekly frequency, back to 1973. This is a trade-weighted broad dollar measure, closely correlated with the ICE DXY."
          stack
        />
        <InsightRow
          label="Regime Zones"
          value="Background shading is trend-based: red = DXY above 200W MA (Strong Dollar / BTC headwind), green = DXY below 200W MA (Weak Dollar / BTC tailwind). Level-based regimes (e.g. DXY > 110) are less useful for timing."
          stack
        />
        <InsightRow
          label="Trend Score"
          value="Composite 0–100 score: Price vs 50W MA (30%), Price vs 200W MA (25%), 50W MA slope (20%), 90D return (15%), DXY level vs 100 (10%). Higher score = stronger dollar = more pressure on BTC."
          stack
        />
        <InsightRow
          label="BTC Overlay"
          value="BTC price shown on log-scale right axis. Data begins ~2010. Toggle off for a cleaner macro-only view."
          stack
        />
        <InsightRow
          label="Important Note"
          value="DXY is a macro context indicator, not a timing signal. Correlation with BTC is time-varying and can break down. Use alongside MVRV, SOPR, and the Skyline Cycle Score."
          stack
        />
      </InsightPanel>
    </div>
  );
}
