import { fetchBTCDailyPrice }        from '@/lib/api/coinmetrics';
import { PageHeader }                from '@/components/dashboard/PageHeader';
import { HeikinAshiChartSection }    from '@/components/charts/HeikinAshiChartSection';
import type { HACandle }             from '@/components/charts/HeikinAshiChart';

export const dynamic = 'force-dynamic';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

// ─── Data processing ────────────────────────────────────────────────────────
async function buildCandles(): Promise<HACandle[]> {
  const daily = await fetchBTCDailyPrice('2010-07-01');

  // 1. Aggregate daily closes → monthly OHLC
  const byMonth: Record<string, number[]> = {};
  for (const p of daily) {
    if (p.price <= 0) continue;
    const key = p.time.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(p.price);
  }

  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthly = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, prices]) => ({
      month,
      open:    prices[0],
      close:   prices[prices.length - 1],
      high:    Math.max(...prices),
      low:     Math.min(...prices),
      partial: month === currentMonth,
    }));

  // 2. Compute Heikin-Ashi
  let prevHAOpen  = 0;
  let prevHAClose = 0;

  const raw: HACandle[] = monthly.map((m, i) => {
    const haClose = (m.open + m.high + m.low + m.close) / 4;
    const haOpen  = i === 0
      ? (m.open + m.close) / 2
      : (prevHAOpen + prevHAClose) / 2;
    const haHigh  = Math.max(m.high,  haOpen, haClose);
    const haLow   = Math.min(m.low,   haOpen, haClose);

    prevHAOpen  = haOpen;
    prevHAClose = haClose;

    return {
      month: m.month,
      haOpen, haClose, haHigh, haLow,
      isGreen:          haClose >= haOpen,
      realClose:        m.close,
      partial:          m.partial,
      isBearEndSignal:  false,
      redStreakBefore:  0,
      currentRedStreak: 0,
    };
  });

  // 3. Detect bear-end signals (first green after ≥ 3 consecutive red months)
  let redStreak = 0;
  for (const c of raw) {
    if (!c.isGreen) {
      redStreak++;
      c.currentRedStreak = redStreak;
    } else {
      c.isBearEndSignal  = redStreak >= 3;
      c.redStreakBefore  = redStreak;
      c.currentRedStreak = 0;
      redStreak = 0;
    }
  }

  return raw;
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default async function HeikinAshiPage() {
  let candles: HACandle[] = [];
  let fetchError = false;

  try {
    candles = await buildCandles();
  } catch {
    fetchError = true;
  }

  const latest   = candles[candles.length - 1] ?? null;
  const signals  = candles.filter(c => c.isBearEndSignal);
  const lastSig  = signals[signals.length - 1] ?? null;

  const signalGain = lastSig && latest
    ? ((latest.realClose - lastSig.realClose) / lastSig.realClose) * 100
    : null;

  // Status derivation
  const isSignal   = latest?.isBearEndSignal ?? false;
  const isGreen    = latest?.isGreen ?? false;
  const redStreak  = latest?.currentRedStreak ?? 0;
  const statusColor = isGreen ? '#35D07F' : '#FF5C5C';
  const statusBorder = isSignal ? '#35D07F' : isGreen ? '#35D07F60' : '#FF5C5C70';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Monthly Heikin-Ashi"
        subtitle="BTC monthly HA candles — first green after 3+ consecutive red months signals the end of the bear market"
      />

      {/* ── Status banner ── */}
      {latest && (
        <div
          className="rounded-xl border px-5 py-4 flex flex-wrap items-center gap-6"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: statusBorder }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold shrink-0"
              style={{ backgroundColor: statusColor + '20', color: statusColor }}
            >
              {isGreen ? '▲' : '▼'}
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
                {latest.month}{latest.partial ? ' · in progress' : ''} — Monthly HA
              </p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: statusColor }}>
                {isSignal
                  ? `BEAR MARKET END SIGNAL — First green after ${latest.redStreakBefore} consecutive red months`
                  : isGreen
                  ? 'Green Candle — Uptrend / Bull Phase Active'
                  : `Red Candle — Bear Phase · ${redStreak} consecutive red month${redStreak !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex gap-6 ml-auto text-xs font-mono shrink-0">
            <div className="text-center">
              <p className="text-base font-bold" style={{ color: 'var(--sct-text)' }}>
                {fmtUSD(latest.realClose)}
              </p>
              <p style={{ color: 'var(--sct-muted)' }}>Last Close</p>
            </div>
            {lastSig && (
              <div className="text-center">
                <p className="text-base font-bold" style={{ color: '#35D07F' }}>{lastSig.month}</p>
                <p style={{ color: 'var(--sct-muted)' }}>Last Signal</p>
              </div>
            )}
            {signalGain != null && (
              <div className="text-center">
                <p className="text-base font-bold" style={{ color: signalGain >= 0 ? '#35D07F' : '#FF5C5C' }}>
                  {signalGain >= 0 ? '+' : ''}{signalGain.toFixed(0)}%
                </p>
                <p style={{ color: 'var(--sct-muted)' }}>Since Signal</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      <HeikinAshiChartSection
        candles={candles}
        latest={latest}
        lastSig={lastSig}
        signalGain={signalGain}
        fetchError={fetchError}
      />

      {/* ── Bottom row: Signals + Interpretation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

        {/* Historical signals */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            All Historical Bear-End Signals
          </p>
          {signals.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>No signals detected.</p>
          ) : (
            <div className="space-y-2.5">
              {[...signals].reverse().map((s, i) => {
                const gainToNow = latest
                  ? ((latest.realClose - s.realClose) / s.realClose) * 100
                  : null;
                const isLatest = i === 0;
                return (
                  <div
                    key={s.month}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                    style={{
                      backgroundColor: isLatest ? '#35D07F12' : 'transparent',
                      border: `1px solid ${isLatest ? '#35D07F30' : 'transparent'}`,
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-bold" style={{ color: '#35D07F' }}>{s.month}</p>
                        {isLatest && (
                          <span className="text-[9px] px-1.5 py-px rounded font-mono" style={{ backgroundColor: '#35D07F20', color: '#35D07F' }}>
                            LATEST
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                        First green after {s.redStreakBefore} red months · entry {fmtUSD(s.realClose)}
                      </p>
                    </div>
                    {gainToNow != null && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono font-bold" style={{ color: gainToNow >= 0 ? '#35D07F' : '#FF5C5C' }}>
                          {gainToNow >= 0 ? '+' : ''}{gainToNow.toFixed(0)}%
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>to today</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interpretation */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            How to Read This Chart
          </p>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#35D07F10', border: '1px solid #35D07F30' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#35D07F' }}>▲ Bear Market End Signal</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              The first monthly green HA candle after 3 or more consecutive red months. Every major BTC bear market bottom has produced this signal. It doesn't mark the exact low — BTC may still retest — but it confirms that selling pressure has structurally exhausted on the monthly timeframe.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#35D07F08', border: '1px solid #35D07F25' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#35D07F' }}>Green Candle</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              HA Close &gt; HA Open. Represents net buying pressure over the full month on a smoothed basis. Consecutive green months = confirmed macro uptrend. Candles with no lower wick signal especially strong momentum.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#FF5C5C08', border: '1px solid #FF5C5C25' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#FF5C5C' }}>Red Candle</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              HA Close &lt; HA Open. Net selling dominates. The longer the red streak, the deeper the bear phase. Candles with no upper wick indicate that every bounce is being sold — a classic bear market signature.
            </p>
          </div>

          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#3B82F608', border: '1px solid #3B82F625' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#3B82F6' }}>Why Heikin-Ashi?</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              Unlike standard candles, HA values are averaged from prior candles, filtering out noise. On a monthly timeframe, this removes short-term volatility entirely and reveals the macro directional bias — making it far easier to spot trend changes and bear market reversals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
