import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import {
  calculateYearlyLows,
  computeFloorTrendScore,
  calcCAGR,
} from '@/lib/indicators/yearlyLows';
import { BitcoinYearlyLowsChart } from '@/components/charts/BitcoinYearlyLowsChart';
import { FloorStaircaseChart } from '@/components/charts/FloorStaircaseChart';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';

export const revalidate = 86400;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function YearlyLowsPage() {
  let lows: ReturnType<typeof calculateYearlyLows> = [];
  let fetchError = false;

  try {
    const prices = await fetchBTCDailyPrice('2012-01-01');
    lows = calculateYearlyLows(prices);
  } catch {
    fetchError = true;
  }

  const current   = lows.at(-1) ?? null;
  const previous  = lows.findLast((l) => !l.isPartialYear) ?? null;
  const fourYear  = current ? lows.find((l) => l.year === current.year - 4) ?? null : null;

  // CAGR from 2012 low to current
  const first = lows.find((l) => l.year === 2012) ?? lows.at(0) ?? null;
  const years = first && current ? current.year - first.year + (current.isPartialYear ? 0 : 1) : 0;
  const cagr  = first && current && years > 0
    ? calcCAGR(first.lowPrice, current.lowPrice, years)
    : null;

  // Floor trend score
  const trend = lows.length >= 3 ? computeFloorTrendScore(lows) : null;

  // Prior cycle low (2-cycle back = 8 years)
  const priorCycleLow = current
    ? lows.reduce<typeof lows[0] | null>((best, l) => {
        // Find lowest yearly low from before current year - 1
        if (l.year >= current.year - 1) return best;
        if (!best || l.lowPrice < best.lowPrice) return l;
        return best;
      }, null)
    : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Yearly Lows"
        subtitle="Annual Bitcoin price floors and long-term adoption trend"
      />

      {/* ── Floor Trend banner ───────────────────────────────────────────── */}
      {trend && (
        <div
          className="flex items-center gap-4 rounded-xl border px-5 py-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: trend.color, borderWidth: 1 }}
        >
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: trend.color }} />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-base font-semibold" style={{ color: trend.color }}>{trend.label}</p>
              <span
                className="px-2.5 py-0.5 rounded text-xs font-mono border"
                style={{ backgroundColor: `${trend.color}18`, borderColor: `${trend.color}40`, color: trend.color }}
              >
                Floor Score {trend.score} / 100
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>{trend.description}</p>
          </div>
          {current && (
            <div className="hidden sm:block text-right">
              <p className="text-2xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
                {fmtUSD(current.lowPrice)}
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
                {current.year} Low{current.isPartialYear ? ' (YTD)' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      {current && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label={`${current.year} Low${current.isPartialYear ? ' (YTD)' : ''}`}
            value={fmtUSD(current.lowPrice)}
            sub={current.lowDate}
            accent="#F7931A"
            freshness="daily"
            source="CoinMetrics"
          />
          <StatCard
            label={`${previous?.year ?? '—'} Low`}
            value={fmtUSD(previous?.lowPrice ?? null)}
            sub={previous ? 'Prior full year' : '—'}
            accent="#3B82F6"
            freshness="daily"
          />
          <StatCard
            label="YoY Floor Change"
            value={fmtPct(current.yoyChange)}
            sub={current.yoyChange == null ? '—'
              : current.yoyChange >= 0
              ? `Floor rising vs ${previous?.year}`
              : `Floor below ${previous?.year}`}
            accent={current.yoyChange == null ? '#94A3B8' : current.yoyChange >= 0 ? '#35D07F' : '#FF5C5C'}
            freshness="daily"
          />
          <StatCard
            label={`vs ${fourYear?.year ?? '4Y'} Low`}
            value={fourYear ? fmtPct(((current.lowPrice - fourYear.lowPrice) / fourYear.lowPrice) * 100) : '—'}
            sub={fourYear ? `${fourYear.year} cycle low: ${fmtUSD(fourYear.lowPrice)}` : 'Not enough history'}
            accent={
              fourYear == null ? '#94A3B8'
              : current.lowPrice >= fourYear.lowPrice ? '#35D07F'
              : '#FF5C5C'
            }
            freshness="daily"
          />
          <StatCard
            label="Annual Low CAGR"
            value={cagr != null ? `${cagr.toFixed(1)}%` : '—'}
            sub={first ? `Since ${first.year} ($${first.lowPrice.toFixed(0)})` : '—'}
            accent="#A78BFA"
            freshness="daily"
          />
        </div>
      )}

      {/* Error state */}
      {(fetchError || lows.length === 0) && (
        <div
          className="rounded-xl border px-5 py-8 text-center"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>
            {fetchError ? 'Unable to fetch price data from CoinMetrics.' : 'No data available.'}
          </p>
        </div>
      )}

      {/* ── Main log-scale chart ─────────────────────────────────────────── */}
      {lows.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Annual Bitcoin Price Floor — Log Scale
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Lowest daily closing price per calendar year · Dashed verticals = halvings · Green = above prior year · Red = below
            </p>
          </div>
          <BitcoinYearlyLowsChart data={lows} />
        </div>
      )}

      {/* ── Prior cycle low status ───────────────────────────────────────── */}
      {current && priorCycleLow && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--sct-text)' }}>
            Prior Cycle Low Test
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: `${current.year} Low${current.isPartialYear ? ' (YTD)' : ''}`,
                value: fmtUSD(current.lowPrice),
                color: '#F7931A',
              },
              {
                label: `All-Time Structural Low (${priorCycleLow.year})`,
                value: fmtUSD(priorCycleLow.lowPrice),
                color: '#FF5C5C',
              },
              {
                label: 'Distance Above Prior Cycle Floor',
                value: fmtPct(((current.lowPrice - priorCycleLow.lowPrice) / priorCycleLow.lowPrice) * 100),
                color: current.lowPrice >= priorCycleLow.lowPrice ? '#35D07F' : '#FF5C5C',
                badge: current.lowPrice >= priorCycleLow.lowPrice
                  ? 'Above Prior Cycle Floor'
                  : 'Below Prior Cycle Floor',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg p-4 border"
                style={{ backgroundColor: `${item.color}08`, borderColor: `${item.color}30` }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--sct-muted)' }}>{item.label}</p>
                <p className="text-xl font-mono font-bold" style={{ color: item.color }}>{item.value}</p>
                {item.badge && (
                  <span
                    className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-mono"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Floor staircase ──────────────────────────────────────────────── */}
      {lows.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
                Floor Staircase — Annual Lows
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                Bar width = log-scale position · Color = direction vs prior year
              </p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
              {[
                { color: '#35D07F', label: 'Rising floor' },
                { color: '#FF5C5C', label: 'Falling floor' },
                { color: '#A78BFA', label: 'Current (YTD)' },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1" style={{ color: l.color }}>
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <FloorStaircaseChart data={lows} />
        </div>
      )}

      {/* ── Full history table ───────────────────────────────────────────── */}
      {lows.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
            Annual Low History
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ color: 'var(--sct-muted)' }}>
                  <th className="text-left pb-2 pr-4">Year</th>
                  <th className="text-right pb-2 pr-4">BTC Floor</th>
                  <th className="text-right pb-2 pr-4">YoY Change</th>
                  <th className="text-left pb-2 pr-4">Low Date</th>
                  <th className="text-left pb-2">Context</th>
                </tr>
              </thead>
              <tbody>
                {[...lows].reverse().map((l) => {
                  const yoyColor = l.yoyChange == null ? 'var(--sct-muted)'
                    : l.yoyChange >= 0 ? '#35D07F' : '#FF5C5C';
                  return (
                    <tr
                      key={l.year}
                      style={{ borderTop: '1px solid var(--sct-border)' }}
                    >
                      <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--sct-text)' }}>
                        {l.year}
                        {l.halvingYear && (
                          <span className="ml-1.5 text-[9px] px-1 rounded" style={{ backgroundColor: '#F7931A20', color: '#F7931A' }}>H</span>
                        )}
                        {l.isPartialYear && (
                          <span className="ml-1 text-[9px] px-1 rounded" style={{ backgroundColor: '#A78BFA20', color: '#A78BFA' }}>YTD</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right" style={{ color: 'var(--sct-text)' }}>
                        {fmtUSD(l.lowPrice)}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold" style={{ color: yoyColor }}>
                        {fmtPct(l.yoyChange)}
                      </td>
                      <td className="py-2 pr-4" style={{ color: 'var(--sct-muted)' }}>{l.lowDate}</td>
                      <td className="py-2" style={{ color: 'var(--sct-muted)' }}>{l.cycleContext}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Interpretation ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--sct-text)' }}>
          How to Read This Chart
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#35D07F' }}>Rising Floor (Green)</p>
            <p>Each year's lowest close is higher than the prior year's. Bitcoin's long-term support structure is strengthening. Most bull market years look like this.</p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#FF5C5C' }}>Falling Floor (Red)</p>
            <p>The annual low undercuts the prior year. Typical in deep bear markets (2015, 2018, 2022). The key structural question is whether the prior <em>cycle</em> floor holds — not just the prior year.</p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#F7931A' }}>Prior Cycle Floor</p>
            <p>Breaking below the previous cycle's low is historically rare and significant. Every major bear market has held the prior cycle's structural low as a floor — a break below that level signals unusual structural stress.</p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#A78BFA' }}>Current Year (YTD)</p>
            <p>The current year shows the running minimum close. This is a partial year figure — the actual annual low may be lower. Interpret with caution early in the year.</p>
          </div>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--sct-muted)' }}>
          <span style={{ color: 'var(--sct-text)' }}>Data source:</span>
          {' '}CoinMetrics Community API (PriceUSD daily closes) · Revalidated every 24 hours.
        </p>
      </div>
    </div>
  );
}
