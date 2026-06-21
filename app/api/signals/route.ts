import { NextResponse }         from 'next/server';
import { fetchDailyPrice }       from '@/lib/api/coinmetrics';
import { getCurrentPosition }    from '@/lib/indicators/halvingCycles';

// Cache for 1 hour — Firebase function runs once daily so this is plenty
export const revalidate = 3600;

// ── Helpers ──────────────────────────────────────────────────────────────────

function slidingSMA(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function regime(prices: number[], ma200: (number | null)[]): 'bull' | 'bear' | 'neutral' {
  const i = prices.length - 1;
  const p = prices[i];
  const ma = ma200[i];
  const maPrev = ma200[Math.max(0, i - 10)];
  if (ma == null) return 'neutral';
  const rising = maPrev != null ? ma > maPrev : true;
  if (p > ma && rising)   return 'bull';
  if (p < ma && !rising)  return 'bear';
  return 'neutral';
}

function computeHA(daily: { time: string; price: number }[]) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const byMonth: Record<string, number[]> = {};
  for (const p of daily) {
    if (p.price <= 0) continue;
    const key = p.time.slice(0, 7);
    (byMonth[key] ??= []).push(p.price);
  }

  const months = Object.keys(byMonth).sort();
  const completed = months.filter(m => m !== currentMonth);

  let prevOpen = 0, prevClose = 0;
  const greenByMonth: Record<string, boolean> = {};
  for (const month of months) {
    const pp = byMonth[month];
    const o = pp[0], c = pp[pp.length - 1];
    const h = Math.max(...pp), l = Math.min(...pp);
    const haClose = (o + h + l + c) / 4;
    const haOpen  = prevClose === 0 ? (o + c) / 2 : (prevOpen + prevClose) / 2;
    prevOpen  = haOpen;
    prevClose = haClose;
    greenByMonth[month] = haClose >= haOpen;
  }

  const last = completed[completed.length - 1] ?? null;
  const prev = completed[completed.length - 2] ?? null;
  return {
    haLastCompletedMonth:   last,
    haLastCompletedIsGreen: last ? (greenByMonth[last] ?? false) : false,
    haPrevCompletedIsGreen: prev ? (greenByMonth[prev] ?? false) : false,
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [btc, eth] = await Promise.all([
      fetchDailyPrice('btc', '2010-01-01'),
      fetchDailyPrice('eth', '2015-01-01'),
    ]);

    // ── BTC indicators ─────────────────────────────────────────────────────
    const bv = btc.map(p => p.price);
    const bMA200  = slidingSMA(bv, 200);
    const bMA730  = slidingSMA(bv, 730);
    const bMA1400 = slidingSMA(bv, 1400);
    const bMA150  = slidingSMA(bv, 150);
    const bMA471  = slidingSMA(bv, 471);
    const bMA350  = slidingSMA(bv, 350);  // 50-week proxy

    const bi    = bv.length - 1;
    const bPrice = bv[bi];

    const btcAbove200dma = bMA200[bi]  != null ? bPrice > bMA200[bi]!  : null;
    const btcAbove2yma   = bMA730[bi]  != null ? bPrice > bMA730[bi]!  : null;
    const btcAbove200wma = bMA1400[bi] != null ? bPrice > bMA1400[bi]! : null;
    const btcRegime      = regime(bv, bMA200);

    const piThreshold  = bMA471[bi] != null ? bMA471[bi]! * 0.745 : null;
    const piCycleRatio = bMA150[bi] != null && piThreshold != null
      ? bMA150[bi]! / piThreshold : null;
    const piCycleInZone = piCycleRatio != null ? piCycleRatio < 1.0 : false;

    let weeklyZoneBtc: 'bull' | 'bear' | 'cheap' | 'none' = 'none';
    if (bMA350[bi] != null && bMA1400[bi] != null) {
      if (bPrice > bMA350[bi]!)      weeklyZoneBtc = 'bull';
      else if (bPrice > bMA1400[bi]!) weeklyZoneBtc = 'bear';
      else                            weeklyZoneBtc = 'cheap';
    }

    const ha = computeHA(btc);

    // ── ETH indicators ─────────────────────────────────────────────────────
    const ev = eth.map(p => p.price);
    const eMA200 = slidingSMA(ev, 200);
    const eMA730 = slidingSMA(ev, 730);

    const ei     = ev.length - 1;
    const ePrice = ev[ei];

    const ethAbove200dma = eMA200[ei] != null ? ePrice > eMA200[ei]! : null;
    const ethAbove2yma   = eMA730[ei] != null ? ePrice > eMA730[ei]! : null;

    // ── Halving phase ──────────────────────────────────────────────────────
    const pos = getCurrentPosition();

    return NextResponse.json({
      btcRegime,
      btcAbove2yma,
      btcAbove200wma,
      btcAbove200dma,
      weeklyZoneBtc,
      piCycleRatio,
      piCycleInZone,
      ...ha,
      ethAbove2yma,
      ethAbove200dma,
      halvingPhaseKey:   pos.dominantPhase?.key   ?? null,
      halvingPhaseLabel: pos.dominantPhase?.label  ?? null,
      btcPrice: bPrice,
      ethPrice: ePrice,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
