import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import {
  calculateWeeklyPoints,
  calculateTrendScore,
  calculateMA100Slope,
  calculateReclaimStatus,
  findRegimeSegments,
  findHistoricalTouchpoints,
} from '@/lib/indicators/weeklyMA';
import { BTC100WChart } from '@/components/charts/BTC100WChart';
import { PageHeader }   from '@/components/dashboard/PageHeader';
import { StatCard }     from '@/components/dashboard/StatCard';

export const revalidate = 86400;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null, decimals = 1): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function slopeLabel(slope: number | null): { text: string; color: string } {
  if (slope == null) return { text: '—', color: '#94A3B8' };
  if (slope >  5)  return { text: 'Strong rise', color: '#35D07F' };
  if (slope >  0)  return { text: 'Moderate rise', color: '#3B82F6' };
  if (slope > -2)  return { text: 'Flattening', color: '#E6B450' };
  return               { text: 'Falling', color: '#FF5C5C' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BTC100WMAPage() {
  let points = await (async () => {
    try {
      const daily = await fetchBTCDailyPrice('2010-01-01');
      return calculateWeeklyPoints(daily);
    } catch {
      return [];
    }
  })();

  const last  = points.findLast((p) => p.ma100 != null) ?? null;
  const slope = calculateMA100Slope(points, 20);
  const score = calculateTrendScore(points);
  const regseg = findRegimeSegments(points);
  const reclaim  = calculateReclaimStatus(points);
  const touchpoints = findHistoricalTouchpoints(points);
  const { text: slopeText, color: slopeColor } = slopeLabel(slope);

  // Restrict chart data to weeks where at least the 50W MA is valid
  const chartPoints = points.filter((p) => p.ma50 != null);

  const distColor = last?.distanceFrom100W == null ? '#94A3B8'
    : last.distanceFrom100W > 5   ? '#35D07F'
    : last.distanceFrom100W < -5  ? '#FF5C5C'
    : '#E6B450';

  const regimeLabel = last?.trendRegime === 'bullish' ? 'Above Trend'
    : last?.trendRegime === 'bearish' ? 'Below Trend'
    : last?.trendRegime === 'testing' ? 'Testing Trend (±5%)'
    : '—';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin 100-Week Moving Average"
        subtitle="Medium-term trend, momentum, and support–resistance structure"
      />

      {/* ── Trend Score banner ──────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 rounded-xl border px-5 py-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: score.color, borderWidth: 1 }}
      >
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: score.color }} />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-base font-semibold" style={{ color: score.color }}>{score.label}</p>
            <span
              className="px-2.5 py-0.5 rounded text-xs font-mono border"
              style={{ backgroundColor: `${score.color}18`, borderColor: `${score.color}40`, color: score.color }}
            >
              Trend Score {score.score} / 100
            </span>
            <span
              className="px-2.5 py-0.5 rounded text-xs font-mono border"
              style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', color: distColor }}
            >
              {regimeLabel}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>{score.description}</p>
        </div>
        {last && (
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-2xl font-mono font-bold" style={{ color: '#F7931A' }}>
              {fmtUSD(last.close)}
            </p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Current BTC Price
            </p>
          </div>
        )}
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      {last && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="BTC Price"
            value={fmtUSD(last.close)}
            sub={last.time}
            accent="#F7931A"
            freshness="daily"
            source="CoinMetrics"
          />
          <StatCard
            label="100-Week MA"
            value={fmtUSD(last.ma100)}
            sub={last.ma100 ? 'Medium-term trend' : 'Insufficient history'}
            accent="#EAB84D"
            freshness="daily"
          />
          <StatCard
            label="Distance from 100W"
            value={fmtPct(last.distanceFrom100W)}
            sub={last.distanceFrom100W == null ? '—'
              : last.distanceFrom100W > 5   ? 'Above trend — bullish'
              : last.distanceFrom100W < -5  ? 'Below trend — bearish'
              : 'Testing trend zone'}
            accent={distColor}
            freshness="daily"
          />
          <StatCard
            label="100W MA Slope (20W)"
            value={slope != null ? fmtPct(slope) : '—'}
            sub={slopeText}
            accent={slopeColor}
            freshness="daily"
          />
          <StatCard
            label={reclaim.status === 'below' ? 'Weeks Below 100W' : 'Weeks Above 100W'}
            value={reclaim.status === 'below' ? String(reclaim.weeksBelow) : String(reclaim.weeksAbove)}
            sub={reclaim.label}
            accent={reclaim.color}
            freshness="daily"
          />
        </div>
      )}

      {/* ── Main chart ──────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTC Weekly Price · 50W · 100W · 200W Moving Averages — Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Green shading = above 100W MA · Amber = testing (±5%) · Red = below 100W MA · Dashed verticals = halvings
          </p>
        </div>
        {chartPoints.length > 0 ? (
          <BTC100WChart points={chartPoints} regimes={regseg} />
        ) : (
          <p className="text-sm text-center py-12" style={{ color: 'var(--sct-muted)' }}>
            Unable to load price data.
          </p>
        )}
      </div>

      {/* ── Secondary stats row ─────────────────────────────────────────── */}
      {last && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 100W MA Reclaim Status */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: `${reclaim.color}40` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: reclaim.color }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
                100W MA Status
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Reclaim Status',
                  value: reclaim.label,
                  color: reclaim.color,
                },
                {
                  label: reclaim.status === 'below' ? 'Weeks Below' : 'Weeks Above',
                  value: reclaim.status === 'below'
                    ? `${reclaim.weeksBelow}w`
                    : `${reclaim.weeksAbove}w`,
                  color: reclaim.color,
                },
                {
                  label: 'Distance',
                  value: fmtPct(reclaim.distancePct),
                  color: distColor,
                },
                {
                  label: '100W MA',
                  value: fmtUSD(last.ma100),
                  color: '#EAB84D',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-3 border" style={{ borderColor: 'var(--sct-border)' }}>
                  <p className="text-[10px] font-mono uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
                    {item.label}
                  </p>
                  <p className="text-sm font-mono font-bold" style={{ color: item.color }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}>
              A confirmed reclaim requires 4+ consecutive weekly closes above the 100W MA
              after a period below it. Fewer than 4 weeks is classified as "attempting".
            </div>
          </div>

          {/* MA Alignment snapshot */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
              Moving Average Alignment
            </p>
            {[
              { label: '50-Week MA',   value: last.ma50,   dist: last.ma50  ? ((last.close - last.ma50)  / last.ma50)  * 100 : null, color: '#3B82F6' },
              { label: '100-Week MA',  value: last.ma100,  dist: last.distanceFrom100W,                                               color: '#EAB84D' },
              { label: '200-Week MA',  value: last.ma200,  dist: last.ma200 ? ((last.close - last.ma200) / last.ma200) * 100 : null, color: '#A855F7' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5 border-b last:border-0 text-xs font-mono" style={{ borderColor: 'var(--sct-border)' }}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-0.5 rounded" style={{ backgroundColor: row.color }} />
                  <span style={{ color: 'var(--sct-muted)' }}>{row.label}</span>
                </span>
                <span style={{ color: row.color }}>{fmtUSD(row.value)}</span>
                <span style={{ color: row.dist == null ? '#4B5563' : row.dist >= 0 ? '#35D07F' : '#FF5C5C' }}>
                  {fmtPct(row.dist)}
                </span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--sct-border)' }}>
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                100W MA slope (20w): <span style={{ color: slopeColor }}>{fmtPct(slope)} — {slopeText}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Historical touchpoints ───────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          Key 100W MA Events — Historical Reference
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left pb-2 pr-4">Event</th>
                <th className="text-right pb-2 pr-4">Date</th>
                <th className="text-right pb-2 pr-4">BTC Price</th>
                <th className="text-right pb-2 pr-4">100W MA</th>
                <th className="text-right pb-2 pr-4">Distance</th>
                <th className="text-left pb-2">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {touchpoints.map((tp) => {
                const dc = tp.distancePct == null ? '#4B5563'
                  : tp.distancePct >= 0 ? '#35D07F' : '#FF5C5C';
                return (
                  <tr key={tp.event} style={{ borderTop: '1px solid var(--sct-border)' }}>
                    <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--sct-text)' }}>{tp.event}</td>
                    <td className="py-2 pr-4 text-right" style={{ color: 'var(--sct-muted)' }}>{tp.date}</td>
                    <td className="py-2 pr-4 text-right" style={{ color: '#F7931A' }}>{fmtUSD(tp.price)}</td>
                    <td className="py-2 pr-4 text-right" style={{ color: '#EAB84D' }}>{fmtUSD(tp.ma100)}</td>
                    <td className="py-2 pr-4 text-right font-semibold" style={{ color: dc }}>
                      {fmtPct(tp.distancePct)}
                    </td>
                    <td className="py-2" style={{ color: 'var(--sct-muted)' }}>{tp.result}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Interpretation panel ─────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--sct-text)' }}>
          How to Read the 100-Week MA
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#35D07F' }}>Above a Rising 100W MA</p>
            <p>Bitcoin is in a constructive medium-term trend. Pullbacks to the 100W MA are historically buyable during bull markets. The MA acts as dynamic support.</p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#E6B450' }}>Testing the 100W MA (±5%)</p>
            <p>Critical decision zone. A clean weekly close back above the MA after a test is historically bullish. A breakdown below with the MA flattening or falling signals trend deterioration.</p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#FF5C5C' }}>Below a Falling 100W MA</p>
            <p>Deep bear territory. The 100W MA broke down in 2015, 2018, and 2022 — each coincided with cycle lows. A reclaim (4+ weekly closes back above) has historically confirmed the trend recovery.</p>
          </div>
        </div>
        <div
          className="mt-4 pt-4 border-t text-xs leading-relaxed"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          <p>
            <span style={{ color: 'var(--sct-text)' }}>Slope matters:</span>{' '}
            A rising 100W MA means more buyers are accumulating at progressively higher prices over time.
            A flattening MA signals indecision. A falling MA means the long-term base is eroding.
            Price position alone is less informative than price position <em>combined with slope direction</em>.
          </p>
          <p className="mt-2">
            <span style={{ color: 'var(--sct-text)' }}>Data source:</span>{' '}
            CoinMetrics Community API (daily closes) → weekly close aggregation → 50W / 100W / 200W simple moving averages.
            Revalidated every 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
