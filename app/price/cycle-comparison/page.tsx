import { fetchBTCDailyPrice }        from '@/lib/api/coinmetrics';
import { PageHeader }                 from '@/components/dashboard/PageHeader';
import { StatCard }                   from '@/components/dashboard/StatCard';
import { HalvingCycleChartSection }   from '@/components/charts/HalvingCycleChartSection';
import {
  HALVING_DEFS,
  alignCycle,
  computeMedianPath,
} from '@/lib/indicators/halvingCycleAlign';

export const revalidate = 86400;

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

export default async function CycleComparisonPage() {
  const prices = await fetchBTCDailyPrice('2012-01-01');

  const aligned = HALVING_DEFS
    .map((_, i) => alignCycle(prices, i))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const medianPath = computeMedianPath(aligned);

  // Current cycle stats
  const active  = aligned.find(a => a.isActive);
  const lastPt  = active?.points[active.points.length - 1];

  const medianAtToday = medianPath.find(
    m => Math.abs(m.day - (lastPt?.day ?? 0)) <= 3,
  );

  const vsMedianIndexed =
    medianAtToday && lastPt
      ? ((lastPt.indexed - medianAtToday.p50) / medianAtToday.p50) * 100
      : null;

  const current = {
    daysSince:       lastPt?.day ?? 0,
    price:           prices[prices.length - 1].price,
    returnPct:       lastPt?.returnPct ?? 0,
    indexed:         lastPt?.indexed ?? 100,
    halvingPrice:    active?.halvingPrice ?? 0,
    vsMedianIndexed,
  };

  // Serialize cycles (keep points for chart)
  const cycles = aligned.map(a => ({
    id:          a.def.id,
    label:       a.def.label,
    halvingDate: a.def.halvingDate,
    halvingPrice: a.halvingPrice,
    blockReward: a.def.blockReward,
    color:       a.def.color,
    strokeWidth: a.def.strokeWidth,
    isActive:    a.isActive,
    peakReturn:  a.peakReturn,
    daysToPeak:  a.daysToPeak,
    maxDrawdown: a.maxDrawdown,
    points:      a.points,
  }));

  // Determine cycle phase label
  const phase =
    current.daysSince < 180  ? 'Post-Halving Consolidation'
    : current.daysSince < 500  ? 'Expansion Window'
    : current.daysSince < 750  ? 'Distribution Watch'
    : current.daysSince < 1050 ? 'Drawdown / Reset'
    : 'Pre-Halving Accumulation';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Cycle Comparison"
        subtitle="Halving-aligned BTC price normalized for cross-cycle comparison — day 0 = halving date"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Days Since Halving"
          value={current.daysSince.toLocaleString()}
          sub="2024 Halving cycle"
          accent="#F7931A"
          freshness="daily"
        />
        <StatCard
          label="Return Since Halving"
          value={`${current.returnPct >= 0 ? '+' : ''}${current.returnPct.toFixed(1)}%`}
          sub="From halving day price"
          accent={current.returnPct >= 0 ? 'var(--sct-green)' : 'var(--sct-red)'}
          freshness="daily"
        />
        <StatCard
          label="vs Historical Median"
          value={
            vsMedianIndexed !== null
              ? `${vsMedianIndexed >= 0 ? '+' : ''}${vsMedianIndexed.toFixed(1)}%`
              : '—'
          }
          sub="Indexed vs prior cycles median"
          accent={
            vsMedianIndexed === null
              ? 'var(--sct-muted)'
              : vsMedianIndexed >= 0
              ? 'var(--sct-green)'
              : 'var(--sct-red)'
          }
          freshness="daily"
        />
        <StatCard
          label="Cycle Phase"
          value={phase.split(' ').slice(0, 2).join(' ')}
          sub={`Day ${current.daysSince} · ${phase}`}
          accent="var(--sct-amber)"
          freshness="daily"
        />
      </div>

      {/* Current Cycle Position card */}
      <div
        className="rounded-xl border p-5 grid grid-cols-1 md:grid-cols-3 gap-6"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="md:col-span-1">
          <p
            className="text-[10px] font-mono tracking-widest uppercase mb-3"
            style={{ color: 'var(--sct-muted)' }}
          >
            Current Cycle Position
          </p>
          <p className="text-2xl font-bold font-mono" style={{ color: '#F7931A' }}>
            Day {current.daysSince}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--sct-muted)' }}>
            2024 Halving Cycle
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--sct-muted)' }}>
            Halving price: {fmtUSD(current.halvingPrice)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Current price: {fmtUSD(current.price)}
          </p>
        </div>

        <div className="md:col-span-2 grid grid-cols-3 gap-4">
          {/* Indexed value */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--sct-bg)', border: '1px solid var(--sct-border)' }}
          >
            <p className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
              Indexed Value
            </p>
            <p className="text-xl font-bold font-mono mt-1" style={{ color: '#F5F7FA' }}>
              {current.indexed.toFixed(1)}
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--sct-muted)' }}>
              Day 0 = 100
            </p>
          </div>

          {/* Historical median */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--sct-bg)', border: '1px solid var(--sct-border)' }}
          >
            <p className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
              Historical Median
            </p>
            <p className="text-xl font-bold font-mono mt-1" style={{ color: '#8B949E' }}>
              {medianAtToday?.p50.toFixed(1) ?? '—'}
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--sct-muted)' }}>
              Prior cycles avg
            </p>
          </div>

          {/* vs Median */}
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--sct-bg)',
              border: `1px solid ${
                vsMedianIndexed !== null && vsMedianIndexed >= 0
                  ? '#35D07F40'
                  : '#F8514940'
              }`,
            }}
          >
            <p className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
              vs Median
            </p>
            <p
              className="text-xl font-bold font-mono mt-1"
              style={{
                color:
                  vsMedianIndexed === null
                    ? 'var(--sct-muted)'
                    : vsMedianIndexed >= 0
                    ? '#35D07F'
                    : '#F85149',
              }}
            >
              {vsMedianIndexed !== null
                ? `${vsMedianIndexed >= 0 ? '+' : ''}${vsMedianIndexed.toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--sct-muted)' }}>
              {vsMedianIndexed === null
                ? 'Insufficient data'
                : vsMedianIndexed >= 10
                ? 'Above Historical Median'
                : vsMedianIndexed >= -10
                ? 'Near Historical Median'
                : 'Below Historical Median'}
            </p>
          </div>
        </div>
      </div>

      {/* Main chart section */}
      <HalvingCycleChartSection
        cycles={cycles}
        medianPath={medianPath}
        current={current}
      />

      {/* Historical Cycle Performance table */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-4"
          style={{ color: 'var(--sct-muted)' }}
        >
          Historical Cycle Performance
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)', borderBottom: '1px solid var(--sct-border)' }}>
                <th className="text-left pb-2">Cycle</th>
                <th className="text-right pb-2">Halving Price</th>
                <th className="text-right pb-2">Peak Return</th>
                <th className="text-right pb-2">Days to Peak</th>
                <th className="text-right pb-2">Max Drawdown</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map(c => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid var(--sct-border)',
                    color: c.isActive ? c.color : 'var(--sct-text)',
                  }}
                >
                  <td className="py-2.5" style={{ color: c.color }}>{c.label}</td>
                  <td className="text-right py-2.5">{fmtUSD(c.halvingPrice)}</td>
                  <td
                    className="text-right py-2.5"
                    style={{ color: c.peakReturn !== null ? '#35D07F' : 'var(--sct-muted)' }}
                  >
                    {c.peakReturn !== null ? `+${c.peakReturn.toFixed(0)}%` : 'In Progress'}
                  </td>
                  <td className="text-right py-2.5">
                    {c.daysToPeak !== null ? `Day ${c.daysToPeak}` : 'In Progress'}
                  </td>
                  <td className="text-right py-2.5" style={{ color: '#F85149' }}>
                    {c.maxDrawdown !== null ? `${c.maxDrawdown.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
