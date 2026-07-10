import { fetchFearGreedHistory, fgColor } from '@/lib/api/feargreed';
import { fetchDailyPrice }                from '@/lib/api/coinmetrics';
import { PageHeader }                     from '@/components/dashboard/PageHeader';
import { StatCard }                       from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow }       from '@/components/dashboard/InsightPanel';
import { FearGreedPageClient }            from '@/components/charts/FearGreedPageClient';
import type { FGCombinedPoint }           from '@/components/charts/FearGreedChart';

export const dynamic = 'force-dynamic';

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export default async function FearGreedPage() {
  const [fgData, btcData] = await Promise.all([
    fetchFearGreedHistory(),
    fetchDailyPrice('btc', '2018-01-01'),
  ]);

  // ── Merge by date ─────────────────────────────────────────────────────────
  const priceMap = new Map(btcData.map(d => [d.time, d.price]));

  const combined: FGCombinedPoint[] = fgData.map(d => ({
    time:    d.time,
    ts:      d.ts,
    price:   priceMap.get(d.time) ?? null,
    fg:      d.value,
    fgClass: d.fgClass,
  }));

  // ── Current stats ─────────────────────────────────────────────────────────
  const latest       = fgData.at(-1)!;
  const currentValue = latest.value;
  const currentClass = latest.fgClass;
  const currentColor = fgColor(currentValue);
  const currentPrice = priceMap.get(latest.time) ?? null;

  const last7  = fgData.slice(-7).map(d => d.value);
  const last30 = fgData.slice(-30).map(d => d.value);
  const last90 = fgData.slice(-90);

  const avg7   = Math.round(avg(last7));
  const avg30  = Math.round(avg(last30));

  // 90-day zone breakdown
  const greedDays90    = last90.filter(d => d.value >= 50).length;
  const fearDays90     = last90.filter(d => d.value < 50).length;
  const extremeFear90  = last90.filter(d => d.value < 25).length;
  const extremeGreed90 = last90.filter(d => d.value >= 75).length;

  // All-time extremes
  const allValues = fgData.map(d => d.value);
  const allTimeMin = Math.min(...allValues);
  const allTimeMax = Math.max(...allValues);
  const allTimeMinDate = fgData.find(d => d.value === allTimeMin)?.time ?? '';
  const allTimeMaxDate = fgData.find(d => d.value === allTimeMax)?.time ?? '';

  // Days since last extreme fear / extreme greed
  const today = Date.now();
  const lastExtFear  = [...fgData].reverse().find(d => d.value < 25);
  const lastExtGreed = [...fgData].reverse().find(d => d.value >= 75);
  const daysSinceExtFear  = lastExtFear  ? Math.floor((today - lastExtFear.ts)  / 86_400_000) : null;
  const daysSinceExtGreed = lastExtGreed ? Math.floor((today - lastExtGreed.ts) / 86_400_000) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Fear & Greed Index"
        subtitle="Market sentiment gauge — extreme fear has historically marked cycle lows, extreme greed marks cycle highs"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current Index"
          value={`${currentValue} / 100`}
          sub={currentClass}
          accent={currentColor}
          freshness="daily"
        />
        <StatCard
          label="7-Day Average"
          value={`${avg7}`}
          sub={fgData.slice(-7).at(0)?.fgClass ?? '—'}
          accent={fgColor(avg7)}
        />
        <StatCard
          label="30-Day Average"
          value={`${avg30}`}
          sub={fgData.slice(-30).at(0)?.fgClass ?? '—'}
          accent={fgColor(avg30)}
        />
        <StatCard
          label="90-Day Split"
          value={`${greedDays90}G / ${fearDays90}F`}
          sub={`${extremeGreed90} Ext Greed · ${extremeFear90} Ext Fear days`}
          accent={greedDays90 > fearDays90 ? '#16a34a' : '#dc2626'}
        />
      </div>

      {/* Regime badge */}
      <div
        className="flex items-center gap-3 rounded-xl border px-5 py-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: currentColor }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: currentColor }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: currentColor }}>
            {currentClass} — {currentValue}
            {currentPrice != null && (
              <span className="text-xs ml-3 font-normal" style={{ color: 'var(--sct-muted)' }}>
                BTC: ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            )}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            {currentValue < 25
              ? 'Historically, extreme fear levels near cycle lows have preceded major Bitcoin recoveries.'
              : currentValue < 50
              ? 'Market is in fear territory. Elevated risk-off sentiment — watch for potential buying opportunities.'
              : currentValue < 75
              ? 'Market is in greed territory. Sentiment is positive but not yet overheated.'
              : 'Extreme greed typically coincides with late-cycle euphoria. Prior ATH peaks have occurred in this zone.'
            }
          </p>
        </div>
      </div>

      {/* Chart */}
      <FearGreedPageClient data={combined} />

      {/* Historical context cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'All-Time Low',
            value: allTimeMin.toString(),
            sub: `${allTimeMinDate} · Record fear`,
            color: '#dc2626',
          },
          {
            label: 'All-Time High',
            value: allTimeMax.toString(),
            sub: `${allTimeMaxDate} · Peak greed`,
            color: '#16a34a',
          },
          {
            label: 'Last Extreme Fear',
            value: lastExtFear ? `${daysSinceExtFear}d ago` : 'N/A',
            sub: lastExtFear ? `${lastExtFear.time} · ${lastExtFear.value}` : '—',
            color: '#dc2626',
          },
          {
            label: 'Last Extreme Greed',
            value: lastExtGreed ? `${daysSinceExtGreed}d ago` : 'N/A',
            sub: lastExtGreed ? `${lastExtGreed.time} · ${lastExtGreed.value}` : '—',
            color: '#16a34a',
          },
        ].map(({ label, value, sub, color }) => (
          <div
            key={label}
            className="rounded-xl border p-4 space-y-1"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>{label}</p>
            <p className="text-xl font-mono font-semibold" style={{ color }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Zone distribution table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--sct-border)' }}
      >
        <div className="px-5 py-4 border-b" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Historical Zone Distribution</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            {fgData.length} days of data · {fgData[0]?.time ?? ''} → {latest.time}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ backgroundColor: 'var(--sct-panel)', color: 'var(--sct-muted)' }}>
                {['Zone', 'Range', 'Total Days', '% of History', 'Typical Context'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium tracking-wider uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { zone: 'Extreme Greed', range: '75–100', color: '#16a34a', filter: (v: number) => v >= 75,  context: 'Late-cycle euphoria — prior BTC ATHs have occurred here' },
                { zone: 'Greed',         range: '50–74',  color: '#65a30d', filter: (v: number) => v >= 50 && v < 75, context: 'Positive sentiment, uptrend intact' },
                { zone: 'Fear',          range: '25–49',  color: '#d97706', filter: (v: number) => v >= 25 && v < 50, context: 'Elevated uncertainty, risk-off behavior' },
                { zone: 'Extreme Fear',  range: '0–24',   color: '#dc2626', filter: (v: number) => v < 25,   context: 'Capitulation zone — historically strongest long-term entry' },
              ].map(({ zone, range, color, filter, context }, i) => {
                const count = allValues.filter(filter).length;
                const pct   = ((count / allValues.length) * 100).toFixed(1);
                return (
                  <tr
                    key={zone}
                    style={{
                      backgroundColor: i % 2 === 0 ? 'var(--sct-card)' : 'var(--sct-panel)',
                      borderTop: `1px solid var(--sct-border)`,
                    }}
                  >
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span style={{ color }}>{zone}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>{range}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--sct-text)' }}>{count}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>{pct}%</td>
                    <td className="px-5 py-3 max-w-xs" style={{ color: 'var(--sct-muted)' }}>{context}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InsightPanel title="Reading the Fear & Greed Index">
        <InsightRow label="What it measures" value="The Alternative.me Crypto Fear & Greed Index aggregates volatility, market momentum, social media sentiment, surveys, Bitcoin dominance, and Google Trends data into a 0–100 score. 0 = maximum fear, 100 = maximum greed." stack />
        <InsightRow label="The contrarian signal" value="Bitcoin historically reaches cycle lows when the F&G index is in Extreme Fear (0–24). The Nov 2022 bottom coincided with readings of 6. This is a mean-reversion indicator — extreme sentiment tends to precede directional reversals." valueColor="#d97706" stack />
        <InsightRow label="What it does NOT tell you" value="The F&G index measures current sentiment, not forward price. Fear can stay elevated for months (2022 bear market), and greed can persist through an entire bull run. It signals regime, not timing." stack />
        <InsightRow label="Best used with" value="Drawdown from ATH (where in the bear cycle?), MVRV Z-Score (on-chain valuation), and the Power Law model (log-scale structural position). When all three align at historical extremes, the combined signal is strongest." stack />
        <InsightRow label="Source" value="Alternative.me Crypto Fear & Greed Index · api.alternative.me/fng · Updated daily" stack />
      </InsightPanel>
    </div>
  );
}
