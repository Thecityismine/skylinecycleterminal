import { fetchBTCHashRibbon }       from '@/lib/api/coinmetrics';
import { PageHeader }               from '@/components/dashboard/PageHeader';
import { StatCard }                 from '@/components/dashboard/StatCard';
import { HashRibbonChartSection }  from '@/components/charts/HashRibbonChartSection';
import type { HRPoint }            from '@/components/charts/HashRibbonChart';

export const dynamic = 'force-dynamic';

// ─── Helpers ────────────────────────────────────────────────────────────────
function smaSliding(values: (number | null)[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v != null) { sum += v; count++; }
    if (i >= period) {
      const old = values[i - period];
      if (old != null) { sum -= old; count--; }
    }
    out.push(count === period ? sum / period : null);
  }
  return out;
}

function fmtUSD(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function fmtHashRate(v: number | null, source: string): string {
  if (v == null) return '—';
  if (source === 'DiffLast') {
    // Difficulty — show in billions (T)
    if (v >= 1e12)  return `${(v / 1e12).toFixed(1)} T`;
    if (v >= 1e9)   return `${(v / 1e9).toFixed(1)} B`;
    return v.toFixed(0);
  }
  // Hash rate in H/s
  if (v >= 1e18)  return `${(v / 1e18).toFixed(1)} EH/s`;
  if (v >= 1e15)  return `${(v / 1e15).toFixed(1)} PH/s`;
  if (v >= 1e12)  return `${(v / 1e12).toFixed(1)} TH/s`;
  if (v >= 1e9)   return `${(v / 1e9).toFixed(1)} GH/s`;
  return `${(v / 1e6).toFixed(1)} MH/s`;
}

function downsamplePreserving(points: HRPoint[], max: number): HRPoint[] {
  if (points.length <= max) return points;
  const keep = new Set<number>();
  for (let i = 1; i < points.length; i++) {
    if (points[i].inCapit !== points[i - 1].inCapit) {
      keep.add(i - 1);
      keep.add(i);
    }
  }
  keep.add(points.length - 1);
  const step = Math.floor(points.length / max);
  return points.filter((_, i) => i % step === 0 || keep.has(i));
}

// ─── Types ───────────────────────────────────────────────────────────────────
type HRStatus = 'CAPITULATION' | 'RECOVERY' | 'NO_SIGNAL';

type CapitEvent = {
  startDate:  string;
  endDate:    string | null;
  startPrice: number;
  endPrice:   number | null;
  durationDays: number | null;
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function HashRibbonsPage() {
  let chartData:    HRPoint[]     = [];
  let capitEvents:  CapitEvent[]  = [];
  let fetchError                   = false;
  let status: HRStatus             = 'NO_SIGNAL';
  let dataSource                   = 'HashRate';

  let currentPrice:   number | null = null;
  let currentMA30:    number | null = null;
  let currentMA60:    number | null = null;
  let currentRatio:   number | null = null;

  try {
    const raw = await fetchBTCHashRibbon('2010-01-01');
    dataSource = raw[raw.length - 1]?.source ?? 'HashRate';

    const hashRates = raw.map(d => d.hashRate);
    const prices    = raw.map(d => d.price);

    const ma30Arr = smaSliding(hashRates, 30);
    const ma60Arr = smaSliding(hashRates, 60);

    // Build full point series (valid from day 60 onward)
    const allPoints: HRPoint[] = raw
      .map((d, i) => {
        const ma30   = ma30Arr[i];
        const ma60   = ma60Arr[i];
        const ratio  = ma30 != null && ma60 != null && ma60 > 0 ? ma30 / ma60 : null;
        const inCapit = ratio != null && ratio < 1.0;
        return { date: d.time, price: d.price, ma30, ma60, ratio, inCapit };
      })
      .filter(p => p.ma60 != null);

    chartData = downsamplePreserving(allPoints, 1500);

    // Detect capitulation events
    let capitStart: { date: string; price: number } | null = null;
    const events: CapitEvent[] = [];

    for (const p of allPoints) {
      const wasIn = capitStart != null;
      if (p.inCapit && !wasIn) {
        capitStart = { date: p.date, price: p.price ?? 0 };
      } else if (!p.inCapit && wasIn && capitStart) {
        events.push({
          startDate:    capitStart.date,
          endDate:      p.date,
          startPrice:   capitStart.price,
          endPrice:     p.price,
          durationDays: Math.round(
            (new Date(p.date + 'T00:00:00').getTime() - new Date(capitStart.date + 'T00:00:00').getTime()) / 86_400_000
          ),
        });
        capitStart = null;
      }
    }
    // Still in capitulation?
    if (capitStart) {
      const last = allPoints[allPoints.length - 1];
      events.push({
        startDate:    capitStart.date,
        endDate:      null,
        startPrice:   capitStart.price,
        endPrice:     null,
        durationDays: Math.round(
          (new Date(last.date + 'T00:00:00').getTime() - new Date(capitStart.date + 'T00:00:00').getTime()) / 86_400_000
        ),
      });
    }
    capitEvents = events;

    // Current values
    const last   = allPoints[allPoints.length - 1];
    currentPrice = last.price;
    currentMA30  = last.ma30;
    currentMA60  = last.ma60;
    currentRatio = last.ratio;

    // Status
    if (last.inCapit) {
      status = 'CAPITULATION';
    } else {
      const lastEvent = events[events.length - 1];
      if (lastEvent?.endDate) {
        const daysSince = Math.round(
          (new Date(last.date + 'T00:00:00').getTime() - new Date(lastEvent.endDate + 'T00:00:00').getTime()) / 86_400_000
        );
        status = daysSince <= 120 ? 'RECOVERY' : 'NO_SIGNAL';
      }
    }
  } catch {
    fetchError = true;
  }

  // ─── Status config ──────────────────────────────────────────────────────
  const SC = {
    CAPITULATION: {
      label:  'Miner Capitulation: Active',
      sub:    '30d hash-rate MA is below 60d MA — miners are shutting off and selling',
      color:  '#FF5C5C',
      border: '#FF5C5C',
      icon:   '⬇',
    },
    RECOVERY: {
      label:  'Miner Capitulation: Complete',
      sub:    'Recovery Signal: Active — 30d hash-rate MA has crossed back above the 60d MA',
      color:  '#35D07F',
      border: '#35D07F',
      icon:   '▲',
    },
    NO_SIGNAL: {
      label:  'No Signal',
      sub:    '30d hash-rate MA is above 60d MA — healthy miner network, no recent capitulation',
      color:  'var(--sct-muted)',
      border: 'var(--sct-border)',
      icon:   '●',
    },
  } as const;

  const sc = SC[status];

  // Ratio bar position (0.5× to 2.0× range, cap at edges)
  const barPct = currentRatio != null
    ? Math.min(Math.max(((currentRatio - 0.5) / (2.0 - 0.5)) * 100, 1), 99)
    : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Hash Ribbons"
        subtitle="Miner capitulation detector — 30-day vs 60-day hash-rate MA cross signals forced selling exhaustion"
      />

      {/* ── Status banner ── */}
      <div
        className="rounded-xl border px-5 py-4 flex flex-wrap items-start gap-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: sc.border }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 mt-0.5"
          style={{ backgroundColor: sc.color + '20', color: sc.color }}
        >
          {sc.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Hash Ribbons — Current Status
          </p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: sc.color }}>{sc.label}</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{sc.sub}</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="BTC Price"
          value={fmtUSD(currentPrice)}
          sub="Latest close"
          accent="var(--sct-text)"
          freshness="daily"
        />
        <StatCard
          label="30-Day MA"
          value={fmtHashRate(currentMA30, dataSource)}
          sub={dataSource === 'DiffLast' ? 'Mining difficulty 30d avg' : 'Hash rate 30d average'}
          accent="#E6B450"
          freshness="daily"
        />
        <StatCard
          label="60-Day MA"
          value={fmtHashRate(currentMA60, dataSource)}
          sub={dataSource === 'DiffLast' ? 'Mining difficulty 60d avg' : 'Hash rate 60d average'}
          accent="#3B82F6"
          freshness="daily"
        />
        <StatCard
          label="Ribbon Ratio (30d / 60d)"
          value={currentRatio != null ? `${currentRatio.toFixed(3)}×` : '—'}
          sub={
            currentRatio == null ? 'Computing...' :
            currentRatio < 1.0   ? 'Below 1.0 — Capitulation Active' :
            currentRatio < 1.05  ? 'Just above 1.0 — Recovery Signal' :
                                   'Above 1.0 — Network healthy'
          }
          accent={
            currentRatio == null ? 'var(--sct-muted)' :
            currentRatio < 1.0   ? '#FF5C5C' :
            currentRatio < 1.05  ? '#35D07F' :
                                   'var(--sct-muted)'
          }
          freshness="daily"
        />
      </div>

      {/* ── Chart card ── */}
      <HashRibbonChartSection
        data={chartData}
        fetchError={fetchError}
        statusLabel={sc.label}
        statusColor={sc.color}
        currentPrice={currentPrice}
        currentMA30={currentMA30}
        currentMA60={currentMA60}
        currentRatio={currentRatio}
        dataSource={dataSource}
      />

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

        {/* Historical capitulation events */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Historical Capitulation Events
          </p>
          {capitEvents.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>No historical events detected.</p>
          ) : (
            <div className="space-y-3">
              {[...capitEvents].reverse().map((ev, i) => {
                const isActive = ev.endDate == null;
                const gain     = ev.endDate && ev.startPrice > 0 && ev.endPrice
                  ? ((ev.endPrice - ev.startPrice) / ev.startPrice) * 100
                  : null;
                return (
                  <div
                    key={ev.startDate}
                    className="rounded-lg px-3 py-3"
                    style={{
                      backgroundColor: isActive ? '#FF5C5C12' : 'transparent',
                      border: `1px solid ${isActive ? '#FF5C5C40' : 'transparent'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[9px] font-mono px-1.5 py-px rounded shrink-0"
                            style={{ backgroundColor: '#FF5C5C20', color: '#FF5C5C' }}
                          >
                            CAPITATION
                          </span>
                          <span className="text-xs font-mono font-bold" style={{ color: '#FF5C5C' }}>
                            {ev.startDate}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                            @ {fmtUSD(ev.startPrice)}
                          </span>
                        </div>
                        {ev.endDate ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[9px] font-mono px-1.5 py-px rounded shrink-0"
                              style={{ backgroundColor: '#35D07F20', color: '#35D07F' }}
                            >
                              RECOVERY
                            </span>
                            <span className="text-xs font-mono font-bold" style={{ color: '#35D07F' }}>
                              {ev.endDate}
                            </span>
                            <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                              @ {fmtUSD(ev.endPrice)} · {ev.durationDays}d
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] font-mono" style={{ color: '#FF5C5C' }}>
                            Still active · {ev.durationDays} days so far
                          </p>
                        )}
                      </div>
                      {gain != null && (
                        <div className="text-right shrink-0">
                          <p
                            className="text-sm font-mono font-bold"
                            style={{ color: gain >= 0 ? '#35D07F' : '#FF5C5C' }}
                          >
                            {gain >= 0 ? '+' : ''}{gain.toFixed(0)}%
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>
                            start → recovery
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interpretation widget */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Signal Interpretation
          </p>

          {/* Ratio zone bar */}
          {barPct != null && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                  30d / 60d hash-rate MA ratio
                </span>
                <span
                  className="text-[11px] font-mono font-bold"
                  style={{
                    color: currentRatio! < 1.0 ? '#FF5C5C' :
                           currentRatio! < 1.05 ? '#35D07F' : 'var(--sct-muted)',
                  }}
                >
                  {currentRatio!.toFixed(3)}×
                </span>
              </div>
              <div className="relative">
                <div className="flex h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: '33%', backgroundColor: '#FF5C5C' }} />
                  <div style={{ width: '7%',  backgroundColor: '#F97316' }} />
                  <div style={{ width: '10%', backgroundColor: '#35D07F' }} />
                  <div style={{ width: '50%', backgroundColor: '#374151' }} />
                </div>
                <div
                  className="absolute rounded-sm"
                  style={{
                    top: '-3px', width: '3px', height: '12px',
                    left: `${barPct}%`,
                    transform: 'translateX(-50%)',
                    backgroundColor: '#fff',
                    boxShadow: `0 0 6px ${currentRatio! < 1.0 ? '#FF5C5C' : '#35D07F'}`,
                  }}
                />
              </div>
              <div
                className="flex justify-between text-[9px] font-mono mt-1.5"
                style={{ color: 'var(--sct-muted)' }}
              >
                <span>0.5×</span>
                <span>0.75×</span>
                <span>1.0×</span>
                <span>1.5×</span>
                <span>2.0×</span>
              </div>
            </div>
          )}

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#FF5C5C10', border: '1px solid #FF5C5C30' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#FF5C5C' }}>Capitulation Phase (ratio &lt; 1.0)</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              The 30d hash-rate MA drops below the 60d MA — miners are shutting off unprofitable rigs and selling BTC to cover operating costs. This forced selling creates sustained downward price pressure. Capitulation can last weeks to months.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#35D07F10', border: '1px solid #35D07F30' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#35D07F' }}>Recovery / Buy Signal (ratio crosses above 1.0)</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              The 30d MA crosses back above the 60d MA — the miner washout is over. Inefficient miners have exited, remaining miners are profitable again, and forced selling has ended. Historically this has preceded major price recoveries within 60–120 days.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#A78BFA10', border: '1px solid #A78BFA30' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#A78BFA' }}>Why Hash Rate Matters</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              Miners are the only natural net sellers of BTC — they receive block rewards and must sell some portion to pay electricity and operating costs. When hash rate drops, miners are shutting off, which means they were previously selling under cost. The capitulation exhausts that sell pressure and acts as a natural bottom-finding mechanism.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#F9731610', border: '1px solid #F9731630' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#F97316' }}>Combine With for Best Results</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              Hash Ribbons alone can give false signals. Highest conviction when combined with: (1) monthly Heikin-Ashi first green candle, (2) Pi Cycle Bottom signal, (3) Realized Price reclaim (price above realized cost basis). All four together is a generational confluence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
