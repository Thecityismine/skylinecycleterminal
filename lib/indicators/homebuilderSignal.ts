import type { WeeklyClose } from '@/lib/api/yahoo';

// Homebuilder health, as a leading read on the housing cycle.
//
// The reason this earns its own indicator rather than sitting inside the FRED
// pillars: builders trade daily, and the housing data they lead is monthly and
// lagged. Months-supply for July publishes in late August. ITB has already
// repriced by then. Builders have historically rolled over before both the
// housing data and the broad market, and — more usefully — have begun repairing
// while the headlines were still bad.
//
// Three things are measured, and only three, because each is checkable:
//
//   Drawdown from the 52-week high .... has the group already broken?
//   Position against its 40-week MA ... is the trend intact?
//   Relative strength against SPY ..... is this housing, or just equities?
//
// The third is the one that matters most and the one most often skipped. A
// builder selling off in a market that is also selling off says nothing about
// housing. A builder selling off while the index holds is a housing signal.

export const BUILDERS = [
  { ticker: 'DHI', name: 'D.R. Horton' },
  { ticker: 'LEN', name: 'Lennar' },
  { ticker: 'PHM', name: 'PulteGroup' },
  { ticker: 'NVR', name: 'NVR' },
  { ticker: 'ITB', name: 'iShares Home Construction' },
  { ticker: 'XHB', name: 'SPDR Homebuilders' },
] as const;

export const BENCHMARK = 'SPY';

export type BuilderRead = {
  ticker:      string;
  name:        string;
  price:       number | null;
  /** % below the trailing 52-week high, ≤ 0. */
  drawdown:    number | null;
  /** % above or below the 40-week moving average. */
  vsTrend:     number | null;
  /** 26-week return minus the benchmark's, in points. */
  relStrength: number | null;
  /** 0-100. High means healthy. */
  score:       number | null;
};

export type HomebuilderSignal = {
  score:    number | null;
  label:    string;
  color:    string;
  builders: BuilderRead[];
  /** Share of the group that reported. */
  coverage: number;
  /** What this implies for the housing cycle, in one line. */
  read:     string;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Maps a value onto 0-100. `atZero` scores 0, `atHundred` scores 100. */
function lin(v: number, atZero: number, atHundred: number): number {
  if (atZero === atHundred) return 50;
  return clamp(((v - atZero) / (atHundred - atZero)) * 100);
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function pctReturn(bars: WeeklyClose[], weeks: number): number | null {
  if (bars.length <= weeks) return null;
  const now = bars[bars.length - 1].close;
  const then = bars[bars.length - 1 - weeks].close;
  if (!(then > 0)) return null;
  return ((now - then) / then) * 100;
}

function readOne(
  ticker: string,
  name: string,
  bars: WeeklyClose[],
  benchReturn26: number | null,
): BuilderRead {
  if (bars.length < 45) {
    return { ticker, name, price: null, drawdown: null, vsTrend: null, relStrength: null, score: null };
  }

  const price = bars[bars.length - 1].close;

  // 52-week high from the trailing year of weekly closes.
  const window52 = bars.slice(-52);
  const high52 = Math.max(...window52.map((b) => b.close));
  const drawdown = high52 > 0 ? ((price - high52) / high52) * 100 : null;

  // 40-week MA — the weekly-bar equivalent of the 200-day, and the line this
  // group is conventionally read against.
  const ma40 = mean(bars.slice(-40).map((b) => b.close));
  const vsTrend = ma40 && ma40 > 0 ? ((price - ma40) / ma40) * 100 : null;

  const own26 = pctReturn(bars, 26);
  const relStrength = own26 != null && benchReturn26 != null ? own26 - benchReturn26 : null;

  // Scoring bands come from how this group actually moves, not from generic
  // equity ranges. Builders routinely sit 20% below a high inside an intact
  // uptrend, so -30% is the floor rather than -20%.
  const parts: Array<[number | null, number]> = [
    [drawdown    == null ? null : lin(drawdown, -30, 0),   0.35],
    [vsTrend     == null ? null : lin(vsTrend, -15, 15),   0.35],
    [relStrength == null ? null : lin(relStrength, -25, 25), 0.30],
  ];

  let sum = 0, w = 0;
  for (const [v, weight] of parts) { if (v == null) continue; sum += v * weight; w += weight; }

  return { ticker, name, price, drawdown, vsTrend, relStrength, score: w === 0 ? null : sum / w };
}

export function computeHomebuilderSignal(
  series: Record<string, WeeklyClose[]>,
): HomebuilderSignal {
  const bench = series[BENCHMARK] ?? [];
  const benchReturn26 = pctReturn(bench, 26);

  const builders = BUILDERS.map((b) => readOne(b.ticker, b.name, series[b.ticker] ?? [], benchReturn26));

  const scores = builders.map((b) => b.score).filter((s): s is number => s != null);
  const score = scores.length ? mean(scores) : null;
  const coverage = builders.length ? scores.length / builders.length : 0;

  return {
    score,
    label: labelFor(score),
    color: colorFor(score),
    builders,
    coverage,
    read: readFor(score),
  };
}

export function labelFor(score: number | null): string {
  if (score == null) return 'Unavailable';
  if (score < 25) return 'Breaking Down';
  if (score < 45) return 'Weakening';
  if (score < 60) return 'Mixed';
  if (score < 78) return 'Firm';
  return 'Strong';
}

export function colorFor(score: number | null): string {
  if (score == null) return '#6F7A86';
  if (score < 25) return '#FF5C5C';
  if (score < 45) return '#F97316';
  if (score < 60) return '#E6B450';
  if (score < 78) return '#35D07F';
  return '#22D3EE';
}

function readFor(score: number | null): string {
  if (score == null) return 'Builder data unavailable, so this leg of the cycle read is missing.';
  if (score < 25) return 'Builders are broken down and lagging the index. Housing deterioration is usually visible here months before it reaches the monthly data.';
  if (score < 45) return 'Builders are weakening relative to the market. Historically this has preceded softening in the housing data rather than followed it.';
  if (score < 60) return 'Builders are mixed — no clear lead either way. Treat the FRED pillars as the primary read for now.';
  if (score < 78) return 'Builders are holding up and roughly keeping pace with the index. No leading warning from this group.';
  return 'Builders are strong and outperforming. When this happens while housing data is still poor, it has historically marked the repair beginning before the headlines turned.';
}
