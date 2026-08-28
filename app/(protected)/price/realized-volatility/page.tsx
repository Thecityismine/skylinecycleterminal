import { fetchDailyPrice }               from '@/lib/api/coinmetrics';
import { PageHeader }                     from '@/components/dashboard/PageHeader';
import { StatCard }                       from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow }       from '@/components/dashboard/InsightPanel';
import { BtcPriceStat }                   from '@/components/dashboard/BtcPriceStat';
import { RealizedVolChartSection }        from '@/components/charts/RealizedVolChartSection';
import {
  computeRealizedVolatility,
  VOL_ZONE_META,
} from '@/lib/indicators/realizedVolatility';

export const dynamic = 'force-dynamic';

function downsample<T>(arr: T[], max = 1400): T[] {
  if (arr.length <= max) return arr;
  const step = Math.floor(arr.length / max);
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
}

export default async function RealizedVolatilityPage() {
  // Pinned to 2012-01-01 to match `btcHistory` in lib/api/macroTerminal.ts, which
  // feeds the same indicator into the Macro Terminal's volatility section.
  //
  // The window is not cosmetic: percentile rank and the long-run average are both
  // computed against whatever history is passed in, so two different start dates
  // would have this page and the Macro Terminal quoting different numbers for the
  // same metric on the same day. Including 2010-2011 raises the long-run average
  // by roughly 15 points, because volatility ran as high as 366% back then.
  //
  // If this start date ever changes, change it in macroTerminal.ts too.
  const raw = await fetchDailyPrice('btc', '2012-01-01');

  const { points, current, compressedAt } = computeRealizedVolatility(raw);
  const chartPoints = downsample(points, 1400);

  const zone = VOL_ZONE_META[current.zone];

  const fmtVol = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Realized Volatility"
        subtitle="Annualized standard deviation of daily log returns, with historical percentile context"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="30-Day Realized Vol"
          value={fmtVol(current.rv30)}
          sub={zone.label}
          accent={zone.color}
          freshness="daily"
        />
        <StatCard
          label="90-Day Realized Vol"
          value={fmtVol(current.rv90)}
          sub="Slower-moving confirmation"
          accent="#A78BFA"
        />
        <StatCard
          label="Historical Percentile"
          value={current.percentile == null ? '—' : `${current.percentile.toFixed(0)}th`}
          sub={
            current.percentile == null
              ? 'Insufficient history'
              : `${current.percentile.toFixed(0)}% of days were calmer than today`
          }
          accent={zone.color}
        />
        <BtcPriceStat
          close={current.price ?? 0}
          accent="#F7931A"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          className="rounded-xl border p-4 space-y-1"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>vs Long-Run Average</p>
          <p className="text-2xl font-mono font-semibold" style={{ color: zone.color }}>
            {current.vsLongRunPct == null ? '—' : `${current.vsLongRunPct.toFixed(0)}%`}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            {current.longRunMean == null
              ? 'Long-run average unavailable'
              : `Long-run average is ${current.longRunMean.toFixed(0)}%. Readings under 100% mean today is calmer than typical.`}
          </p>
        </div>

        <div
          className="rounded-xl border p-4 space-y-1"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>Compression Threshold</p>
          <p className="text-2xl font-mono font-semibold" style={{ color: '#35D07F' }}>
            {fmtVol(compressedAt)}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            30d vol below this sits in the bottom 15% of all history — the level VanEck treats as an active capitulation signal.
          </p>
        </div>

        <div
          className="rounded-xl border p-4 space-y-1"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>Drawdown Gate</p>
          <p
            className="text-2xl font-mono font-semibold"
            style={{ color: current.drawdownPct != null && current.drawdownPct <= -35 ? '#35D07F' : 'var(--sct-muted)' }}
          >
            {current.drawdownPct == null ? '—' : `${current.drawdownPct.toFixed(1)}%`}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            Compression only reads as capitulation below −35% from ATH. Above it, quiet markets are just quiet.
          </p>
        </div>
      </div>

      {/* Signal badge */}
      <div
        className="flex items-center gap-3 rounded-xl border px-5 py-3"
        style={{
          backgroundColor: 'var(--sct-card)',
          borderColor: current.capitulationSignal ? '#35D07F' : zone.color,
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: current.capitulationSignal ? '#35D07F' : zone.color }}
        />
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: current.capitulationSignal ? '#35D07F' : zone.color }}
          >
            {current.capitulationSignal
              ? `Capitulation signal ACTIVE — ${fmtVol(current.rv30)}`
              : `Volatility ${zone.label} — ${fmtVol(current.rv30)} · signal not active`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            {current.capitulationSignal
              ? 'Volatility is in the bottom 15% of its history while price sits more than 35% below the all-time high. Sellers appear exhausted.'
              : zone.desc}
          </p>
        </div>
      </div>

      {/* Chart */}
      <RealizedVolChartSection
        data={chartPoints}
        longRunMean={current.longRunMean}
        compressedAt={compressedAt}
        rv30={current.rv30}
        rv90={current.rv90}
        percentile={current.percentile}
        vsLongRunPct={current.vsLongRunPct}
        drawdownPct={current.drawdownPct}
        zone={current.zone}
        zoneLabel={zone.label}
        zoneColor={zone.color}
        signalActive={current.capitulationSignal}
        price={current.price}
        generatedAt={new Date().toISOString()}
      />

      <InsightPanel title="Realized Volatility Read">
        <InsightRow
          label="What this measures"
          value="The annualized standard deviation of Bitcoin's daily log returns over a rolling window. It is backward-looking, measured volatility — what price actually did — not an options-implied forecast of what it might do."
          stack
        />
        <InsightRow
          label="Why compression matters"
          value="Heavy selling burns through the supply of willing sellers. Once they are gone, price stops moving. Volatility collapsing after a large drawdown is the signature of an exhausted market, which is why it is the second of VanEck's twelve capitulation indicators."
          stack
        />
        <InsightRow
          label="The trap"
          value="Compressed volatility on its own is not bullish. Quiet mid-bull consolidation looks identical on this series. Only the pairing of a deep drawdown and collapsed volatility carries the capitulation reading — which is why the signal above requires both and never fires on volatility alone."
          valueColor="#E6B450"
          stack
        />
        <InsightRow
          label="What it does NOT tell you"
          value="Volatility says nothing about direction. It compresses before large moves without indicating which way they resolve. A quiet market is a coiled one, not a rising one."
          valueColor="#E6B450"
          stack
        />
        <InsightRow
          label="Methodology"
          value="30-day and 90-day windows, annualized with the square root of 365 rather than the 252 used for equities, because Bitcoin trades every calendar day. Percentiles are ranked against the full history since 2012. Each day's value uses only prices up to that day, so the series never revises."
          stack
        />
      </InsightPanel>
    </div>
  );
}
