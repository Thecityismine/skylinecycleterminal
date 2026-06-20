import { fetchBTCDailyPrice }   from '@/lib/api/coinmetrics';
import { PageHeader }            from '@/components/dashboard/PageHeader';
import { StatCard }              from '@/components/dashboard/StatCard';
import { PiCycleBottomChart }   from '@/components/charts/PiCycleBottomChart';
import type { PiBottomPoint }   from '@/components/charts/PiCycleBottomChart';

export const revalidate = 86400;

// ─── Helpers ────────────────────────────────────────────────────────────────
function smaSliding(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function fmtUSD(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

// Downsample while preserving zone boundary points for accurate shading
function downsampleWithBoundaries(points: PiBottomPoint[], max: number): PiBottomPoint[] {
  if (points.length <= max) return points;
  const keep = new Set<number>();
  for (let i = 1; i < points.length; i++) {
    if (points[i].inZone !== points[i - 1].inZone) {
      keep.add(i - 1);
      keep.add(i);
    }
  }
  keep.add(points.length - 1);
  const step = Math.floor(points.length / max);
  return points.filter((_, i) => i % step === 0 || keep.has(i));
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = 'BOTTOM_ZONE' | 'RECOVERY' | 'NO_SIGNAL';

type CrossEvent = {
  date:      string;
  type:      'INTO_ZONE' | 'OUT_OF_ZONE';
  price:     number;
  ma150:     number;
  threshold: number;
};

type ZoneEvent = {
  start: CrossEvent;
  end:   CrossEvent | null;
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function PiCycleBottomPage() {
  let chartData:      PiBottomPoint[] = [];
  let crossovers:     CrossEvent[]    = [];
  let zoneEvents:     ZoneEvent[]     = [];
  let fetchError                       = false;
  let status: Status                   = 'NO_SIGNAL';

  let currentPrice:     number | null = null;
  let currentMA150:     number | null = null;
  let currentThreshold: number | null = null;
  let ratio:            number | null = null;

  try {
    const daily  = await fetchBTCDailyPrice('2010-01-01');
    const prices = daily.map(d => (d.price > 0 ? d.price : 0));

    const ma150Arr = smaSliding(prices, 150);
    const ma471Arr = smaSliding(prices, 471);

    // Build full point series (valid from day 471 onward)
    const allPoints: PiBottomPoint[] = daily
      .map((d, i) => {
        const ma150     = ma150Arr[i];
        const ma471     = ma471Arr[i];
        const threshold = ma471 != null ? ma471 * 0.745 : null;
        const inZone    = ma150 != null && threshold != null && ma150 < threshold;
        return {
          date:      d.time,
          price:     d.price > 0 ? d.price : null,
          ma150,
          threshold,
          inZone,
        };
      })
      .filter(p => p.threshold != null);

    chartData = downsampleWithBoundaries(allPoints, 1500);

    // Detect crossovers
    let wasInZone = false;
    for (const p of allPoints) {
      const inZ = p.inZone;
      if (inZ && !wasInZone && p.ma150 && p.threshold) {
        crossovers.push({ date: p.date, type: 'INTO_ZONE',  price: p.price ?? 0, ma150: p.ma150, threshold: p.threshold });
      }
      if (!inZ && wasInZone && p.ma150 && p.threshold) {
        crossovers.push({ date: p.date, type: 'OUT_OF_ZONE', price: p.price ?? 0, ma150: p.ma150, threshold: p.threshold });
      }
      wasInZone = inZ;
    }

    // Pair INTO_ZONE → OUT_OF_ZONE events
    for (let i = 0; i < crossovers.length; i++) {
      if (crossovers[i].type === 'INTO_ZONE') {
        const end = crossovers[i + 1]?.type === 'OUT_OF_ZONE' ? crossovers[i + 1] : null;
        zoneEvents.push({ start: crossovers[i], end });
        if (end) i++;
      }
    }

    // Current values
    const last        = allPoints[allPoints.length - 1];
    currentPrice      = last.price;
    currentMA150      = last.ma150;
    currentThreshold  = last.threshold;
    ratio             = currentMA150 && currentThreshold ? currentMA150 / currentThreshold : null;

    // Status
    if (last.inZone) {
      status = 'BOTTOM_ZONE';
    } else {
      const lastCross = crossovers[crossovers.length - 1];
      if (lastCross?.type === 'OUT_OF_ZONE') {
        const daysSince = (new Date(last.date).getTime() - new Date(lastCross.date).getTime()) / 86_400_000;
        status = daysSince <= 365 ? 'RECOVERY' : 'NO_SIGNAL';
      }
    }
  } catch {
    fetchError = true;
  }

  // ─── Status config ──────────────────────────────────────────────────────
  const SC = {
    BOTTOM_ZONE: {
      label:  'Bottom Zone — Signal Active',
      color:  '#3B82F6',
      border: '#3B82F6',
      icon:   '⬇',
      desc:   '150-day MA is currently below the 471d×0.745 threshold. Historically the most reliable long-term accumulation zone in BTC.',
    },
    RECOVERY: {
      label:  'Recovery Confirmed',
      color:  '#35D07F',
      border: '#35D07F',
      icon:   '▲',
      desc:   '150-day MA has crossed back above the 471d×0.745 threshold — bull market resumption historically confirmed. Watch for the monthly Heikin-Ashi first green candle for additional confirmation.',
    },
    NO_SIGNAL: {
      label:  'No Signal',
      color:  'var(--sct-muted)',
      border: 'var(--sct-border)',
      icon:   '●',
      desc:   '150-day MA is above the 471d×0.745 threshold. No bottom zone active — normal bull market or early recovery conditions.',
    },
  } as const;

  const sc = SC[status];

  // ─── Ratio bar position (0.5× to 1.5×, marker at current ratio) ─────────
  const barPct = ratio != null
    ? Math.min(Math.max(((ratio - 0.5) / (1.5 - 0.5)) * 100, 1), 99)
    : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Pi Cycle Bottom"
        subtitle="Bullish bear-market-end signal — 150-day MA crosses below 471-day MA × 0.745"
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
            Pi Cycle Bottom — Current Status
          </p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: sc.color }}>{sc.label}</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{sc.desc}</p>
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
          label="150-Day MA"
          value={fmtUSD(currentMA150)}
          sub="Short-term trend line"
          accent="#E6B450"
          freshness="daily"
        />
        <StatCard
          label="471d MA × 0.745"
          value={fmtUSD(currentThreshold)}
          sub="Signal threshold"
          accent="#3B82F6"
          freshness="daily"
        />
        <StatCard
          label="Ratio (150d / Threshold)"
          value={ratio != null ? `${ratio.toFixed(3)}×` : '—'}
          sub={
            ratio == null ? 'Computing...' :
            ratio < 1.0   ? 'Below 1.0 — Bottom Zone Active' :
            ratio < 1.15  ? 'Near threshold — Watch closely' :
                            'Above threshold — No signal'
          }
          accent={
            ratio == null ? 'var(--sct-muted)' :
            ratio < 1.0   ? '#3B82F6' :
            ratio < 1.15  ? '#E6B450' :
                            'var(--sct-muted)'
          }
          freshness="daily"
        />
      </div>

      {/* ── Chart card ── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Pi Cycle Bottom — BTC Price vs Moving Averages · Log Scale
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Blue shading = bottom zone active (150d MA below 471d×0.745) · Signal fires on the cross-under
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs font-mono shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5" style={{ backgroundColor: 'rgba(247,249,252,0.75)' }} />
              <span style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5" style={{ backgroundColor: '#E6B450' }} />
              <span style={{ color: '#E6B450' }}>150d MA</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5" style={{ backgroundColor: '#3B82F6' }} />
              <span style={{ color: '#3B82F6' }}>471d × 0.745</span>
            </span>
          </div>
        </div>

        {fetchError ? (
          <div
            className="h-[460px] flex items-center justify-center rounded-lg border text-sm"
            style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
          >
            Unable to load price data — CoinMetrics API unreachable
          </div>
        ) : (
          <PiCycleBottomChart data={chartData} />
        )}
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

        {/* Historical zone events */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Historical Bottom Zone Events
          </p>
          {zoneEvents.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>No historical events detected.</p>
          ) : (
            <div className="space-y-3">
              {[...zoneEvents].reverse().map((ev, i) => {
                const isActive  = ev.end == null;
                const gainEntry = ev.end && ev.start.price > 0
                  ? ((ev.end.price - ev.start.price) / ev.start.price) * 100
                  : null;
                return (
                  <div
                    key={ev.start.date}
                    className="rounded-lg px-3 py-3"
                    style={{
                      backgroundColor: isActive ? '#3B82F615' : 'transparent',
                      border: `1px solid ${isActive ? '#3B82F640' : 'transparent'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono px-1.5 py-px rounded" style={{ backgroundColor: '#3B82F620', color: '#3B82F6' }}>
                            SIGNAL
                          </span>
                          <span className="text-xs font-mono font-bold" style={{ color: '#3B82F6' }}>{ev.start.date}</span>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                            @ {fmtUSD(ev.start.price)}
                          </span>
                        </div>
                        {ev.end ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono px-1.5 py-px rounded" style={{ backgroundColor: '#35D07F20', color: '#35D07F' }}>
                              RECOVERY
                            </span>
                            <span className="text-xs font-mono font-bold" style={{ color: '#35D07F' }}>{ev.end.date}</span>
                            <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                              @ {fmtUSD(ev.end.price)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] font-mono mt-1" style={{ color: '#3B82F6' }}>
                            Still in zone — no recovery cross yet
                          </p>
                        )}
                      </div>
                      {gainEntry != null && (
                        <div className="text-right shrink-0">
                          <p
                            className="text-sm font-mono font-bold"
                            style={{ color: gainEntry >= 0 ? '#35D07F' : '#FF5C5C' }}
                          >
                            {gainEntry >= 0 ? '+' : ''}{gainEntry.toFixed(0)}%
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>
                            signal → recovery
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

        {/* Signal interpretation widget */}
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
                  150d MA / (471d × 0.745)
                </span>
                <span
                  className="text-[11px] font-mono font-bold"
                  style={{ color: ratio! < 1.0 ? '#3B82F6' : ratio! < 1.15 ? '#E6B450' : 'var(--sct-muted)' }}
                >
                  {ratio!.toFixed(3)}×
                </span>
              </div>
              <div className="relative">
                <div className="flex h-1.5 rounded-full overflow-hidden">
                  {/* < 0.85 Deep Bottom */}
                  <div style={{ width: '35%', backgroundColor: '#3B82F6' }} />
                  {/* 0.85–1.0 Bottom Zone */}
                  <div style={{ width: '15%', backgroundColor: '#60A5FA' }} />
                  {/* 1.0–1.15 Recovery */}
                  <div style={{ width: '15%', backgroundColor: '#35D07F' }} />
                  {/* > 1.15 Normal */}
                  <div style={{ width: '35%', backgroundColor: '#374151' }} />
                </div>
                <div
                  className="absolute rounded-sm"
                  style={{
                    top: '-3px', width: '3px', height: '12px',
                    left: `${barPct}%`,
                    transform: 'translateX(-50%)',
                    backgroundColor: '#fff',
                    boxShadow: `0 0 6px ${ratio! < 1.0 ? '#3B82F6' : '#35D07F'}`,
                  }}
                />
              </div>
              <div
                className="flex justify-between text-[9px] font-mono mt-1.5"
                style={{ color: 'var(--sct-muted)' }}
              >
                <span>0.5×</span>
                <span>0.85×</span>
                <span>1.0×</span>
                <span>1.15×</span>
                <span>1.5×</span>
              </div>
            </div>
          )}

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#3B82F610', border: '1px solid #3B82F630' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#3B82F6' }}>Bottom Zone (ratio &lt; 1.0)</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              The 150d MA crosses below the 471d×0.745 threshold. This has only occurred during the deepest bear market bottoms in BTC's history — 2015, 2018–2019, and 2022. Each was followed by a multi-year bull run. Price may continue lower after the signal fires, but history shows this is the long-term accumulation zone.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#35D07F10', border: '1px solid #35D07F30' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#35D07F' }}>Recovery Confirmed (ratio crosses above 1.0)</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              When the 150d MA crosses back above the threshold, selling pressure has structurally reversed. Combine with the monthly Heikin-Ashi first-green candle for maximum conviction — two independent signals aligning is historically the strongest buy confirmation.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#E6B45010', border: '1px solid #E6B45030' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#E6B450' }}>Pi Cycle Math — Why These Numbers?</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              471 ÷ 150 ≈ π (3.14159…) — hence the name. The 0.745 multiplier scales the longer MA down to create a lower band that has historically matched BTC bear market floors. Together these two lines form a "Pi" ratio relationship that has been remarkably stable across BTC's entire history.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#F9731610', border: '1px solid #F9731630' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#F97316' }}>Combine With for Best Results</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              Best used alongside: (1) Monthly Heikin-Ashi — first green candle after reds, (2) MVRV Z-Score below 0, (3) Puell Multiple below 0.5, (4) 2-Year MA Multiplier below 1×. When the Pi Cycle Bottom fires alongside 2+ of these, it has historically been a generational entry point.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
