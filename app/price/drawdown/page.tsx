import { fetchDailyPrice }           from '@/lib/api/coinmetrics';
import { PageHeader }                 from '@/components/dashboard/PageHeader';
import { StatCard }                   from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow }   from '@/components/dashboard/InsightPanel';
import { BTCDrawdownPageClient }      from '@/components/charts/BTCDrawdownPageClient';
import {
  calculateDrawdownFromATH,
  getDrawdownRegime,
  drawdownSeverityPct,
  recoveryNeededPct,
  findATHDate,
  HISTORICAL_CYCLES,
} from '@/lib/indicators/drawdownFromATH';

export const dynamic = 'force-dynamic';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtUSD(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number, dp = 1): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(dp)}%`;
}

function downsample<T>(arr: T[], max = 1400): T[] {
  if (arr.length <= max) return arr;
  const step = Math.floor(arr.length / max);
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default async function BTCDrawdownPage() {
  // Fetch full BTC history â€” start from 2010 for complete drawdown picture
  const raw = await fetchDailyPrice('btc', '2010-07-01');

  const allPoints   = calculateDrawdownFromATH(raw);
  const chartPoints = downsample(allPoints, 1400);

  // â”€â”€ Current stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const last         = allPoints.at(-1)!;
  const currentPrice = last.close;
  const currentATH   = last.ath;
  const currentDD    = last.drawdown;

  const athDate     = findATHDate(allPoints)!;
  const athTs       = new Date(athDate + 'T00:00:00Z').getTime();
  const daysSinceATH = Math.floor((Date.now() - athTs) / 86_400_000);

  const recovery     = recoveryNeededPct(currentATH, currentPrice);
  const allDrawdowns = allPoints.map(p => p.drawdown);
  const severityPct  = drawdownSeverityPct(allDrawdowns, currentDD);

  const regime = getDrawdownRegime(currentDD);

  // â”€â”€ Current cycle max drawdown (since the current ATH) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pointsSinceATH  = allPoints.filter(p => p.time >= athDate);
  const currentCycleMax = pointsSinceATH.length > 0
    ? Math.min(...pointsSinceATH.map(p => p.drawdown))
    : 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Drawdown From ATH"
        subtitle="Current distance from Bitcoin's all-time high, with historical bear-market context"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current Drawdown"
          value={`${currentDD.toFixed(1)}%`}
          sub={regime.label}
          accent={regime.color}
        />
        <StatCard
          label="All-Time High"
          value={fmtUSD(currentATH)}
          sub={athDate}
          accent="var(--sct-text)"
          freshness="daily"
        />
        <StatCard
          label="BTC Price"
          value={fmtUSD(currentPrice)}
          sub={`Recovery to ATH: ${fmtPct(recovery, 1)}`}
          accent="#F7931A"
        />
        <StatCard
          label="Days Since ATH"
          value={daysSinceATH > 0 ? daysSinceATH.toLocaleString() : 'ATH Today'}
          sub={daysSinceATH > 0 ? `Since ${athDate}` : 'New all-time high set today'}
          accent={daysSinceATH > 500 ? '#FF5C5C' : daysSinceATH > 200 ? '#E6B450' : '#35D07F'}
        />
      </div>

      {/* Secondary metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          className="rounded-xl border p-4 space-y-1"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>Recovery Needed</p>
          <p className="text-2xl font-mono font-semibold" style={{ color: recovery > 100 ? '#FF5C5C' : recovery > 50 ? '#F97316' : '#E6B450' }}>
            {recovery < 0.1 ? 'â€”' : fmtPct(recovery, 1)}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            {recovery > 0.1
              ? `A ${fmtPct(recovery, 0)} gain from current price is needed to reach ${fmtUSD(currentATH)}`
              : 'Bitcoin is at its all-time high'
            }
          </p>
        </div>

        <div
          className="rounded-xl border p-4 space-y-1"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>Historical Severity</p>
          <p className="text-2xl font-mono font-semibold" style={{ color: severityPct > 70 ? '#FF5C5C' : severityPct > 45 ? '#F97316' : '#35D07F' }}>
            {severityPct}th %ile
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            {severityPct}% of all historical daily closes had a less severe drawdown than today
          </p>
        </div>

        <div
          className="rounded-xl border p-4 space-y-1"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>Current Cycle Max DD</p>
          <p className="text-2xl font-mono font-semibold" style={{ color: getDrawdownRegime(currentCycleMax).color }}>
            {currentCycleMax.toFixed(1)}%
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            Deepest pullback since {athDate}
          </p>
        </div>
      </div>

      {/* Regime badge */}
      <div
        className="flex items-center gap-3 rounded-xl border px-5 py-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: regime.color }}
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: regime.color }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: regime.color }}>{regime.label} â€” {currentDD.toFixed(1)}%</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{regime.desc}</p>
        </div>
      </div>

      {/* Chart */}
      <BTCDrawdownPageClient
        data={chartPoints}
        currentDD={currentDD}
        currentATH={currentATH}
        currentPrice={currentPrice}
        athDate={athDate}
        daysSinceATH={daysSinceATH}
        recovery={recovery}
        currentCycleMax={currentCycleMax}
        regimeLabel={regime.label}
        regimeColor={regime.color}
      />

      {/* Historical cycle comparison table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--sct-border)' }}
      >
        <div className="px-5 py-4 border-b" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Historical Bear Market Drawdowns</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Based on daily close data from CoinMetrics â€” peak-to-trough from cycle ATH
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ backgroundColor: 'var(--sct-panel)', color: 'var(--sct-muted)' }}>
                {['Cycle', 'ATH Date', 'Bottom Date', 'Max Drawdown', 'Days to Low', 'Days to Recovery'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium tracking-wider uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_CYCLES.map((c, i) => (
                <tr
                  key={c.label}
                  style={{
                    backgroundColor: i % 2 === 0 ? 'var(--sct-card)' : 'var(--sct-panel)',
                    borderTop: `1px solid var(--sct-border)`,
                  }}
                >
                  <td className="px-5 py-3" style={{ color: 'var(--sct-text)' }}>{c.label}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>{c.athDate}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>{c.bottomDate}</td>
                  <td className="px-5 py-3 font-semibold" style={{ color: '#FF5C5C' }}>{c.maxDrawdown.toFixed(1)}%</td>
                  <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>{c.daysToLow} days</td>
                  <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>
                    {c.daysToRecovery != null ? `${c.daysToRecovery} days` : 'â€”'}
                  </td>
                </tr>
              ))}
              {/* Current cycle */}
              <tr style={{ backgroundColor: 'var(--sct-card)', borderTop: `1px solid var(--sct-border)` }}>
                <td className="px-5 py-3 font-semibold" style={{ color: '#E6B450' }}>Current Cycle</td>
                <td className="px-5 py-3" style={{ color: '#E6B450' }}>{athDate}</td>
                <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>In progress</td>
                <td className="px-5 py-3 font-semibold" style={{ color: getDrawdownRegime(currentCycleMax).color }}>
                  {currentCycleMax.toFixed(1)}%
                </td>
                <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>
                  {currentDD < -0.5 ? `${daysSinceATH} days` : 'At ATH'}
                </td>
                <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>In progress</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recovery math note */}
      <div
        className="rounded-xl border px-5 py-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--sct-muted)' }}>
          The Recovery Math
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
          {[
            { loss: 'âˆ’25%', needed: '+33%' },
            { loss: 'âˆ’50%', needed: '+100%' },
            { loss: 'âˆ’75%', needed: '+300%' },
          ].map(({ loss, needed }) => (
            <div key={loss} className="flex items-center gap-2">
              <span className="text-[#FF5C5C]">{loss} loss</span>
              <span>â†’</span>
              <span style={{ color: '#35D07F' }}>{needed} needed to recover</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-3" style={{ color: 'var(--sct-muted)' }}>
          Drawdown depth is asymmetric: a 50% decline requires a 100% gain to break even.
          This is why bear-market capitulation zones (-77% to -94%) historically offered the highest long-term return potential â€” the math of recovery is extremely favorable.
        </p>
      </div>

      <InsightPanel title="Drawdown Read">
        <InsightRow
          label="What the drawdown shows"
          value="The drawdown from ATH captures how much pain the market is currently pricing in relative to peak optimism. Unlike price charts, drawdown is comparable across all cycles regardless of the absolute BTC price level."
          stack
        />
        <InsightRow
          label="What it does NOT show"
          value="The drawdown does not tell you where the bottom is. Every bear market in Bitcoin history looked like a normal correction before it became extreme. Use it for context, not prediction."
          valueColor="#E6B450"
          stack
        />
        <InsightRow
          label="Signal confirmation"
          value="The most reliable read comes when drawdown context aligns with on-chain metrics (MVRV, NUPL, Realized Price), the Power Law model, and macro liquidity signals. A single chart is never the full picture."
          stack
        />
        <InsightRow
          label="Historical range"
          value={`All prior Bitcoin bear market cycles have bottomed between âˆ’77% and âˆ’94% from their respective ATH. The current cycle's max drawdown of ${currentCycleMax.toFixed(1)}% provides context for where we sit relative to historical bear extremes.`}
          stack
        />
      </InsightPanel>
    </div>
  );
}
