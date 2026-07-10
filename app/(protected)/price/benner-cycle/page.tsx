import { PageHeader } from '@/components/dashboard/PageHeader';
import { BennerCycleChart } from '@/components/charts/BennerCycleChart';

export const dynamic = 'force-dynamic';

// ─── All cycle dates ────────────────────────────────────────────────────────
const PANIC = [1927, 1945, 1965, 1981, 1999, 2019, 2035, 2053];
const SELL  = [1926, 1935, 1945, 1953, 1962, 1972, 1980, 1989, 1999, 2007, 2016, 2026, 2034, 2043, 2053];
const BUY   = [1924, 1931, 1942, 1951, 1958, 1969, 1978, 1985, 1996, 2005, 2012, 2023, 2032, 2039, 2050, 2059];

// Historical context — real market events that aligned with Benner dates
const HISTORICAL: { year: number; event: string; type: 'A' | 'B' | 'C' }[] = [
  { year: 2023, type: 'C', event: 'SVB banking crisis — crypto bear market bottom' },
  { year: 2019, type: 'A', event: 'Repo market panic, pre-COVID stress' },
  { year: 2016, type: 'B', event: 'Pre-election S&P 500 peak, BTC halving cycle' },
  { year: 2012, type: 'C', event: 'European sovereign debt crisis bottom' },
  { year: 2007, type: 'B', event: 'S&P 500 all-time high (October 2007)' },
  { year: 2005, type: 'C', event: 'Pre-housing-bubble bottom — best long-term entry' },
  { year: 1999, type: 'A', event: 'Dot-com euphoria peak + panic' },
  { year: 1999, type: 'B', event: 'Nasdaq peaks at 5,048 — sell signal confirmed' },
  { year: 1996, type: 'C', event: 'Tech bear bottom before the dot-com run' },
  { year: 1981, type: 'A', event: 'Volcker recession, S&P 500 bear market' },
  { year: 1980, type: 'B', event: 'Gold peak at $850, commodity top' },
];

// Upcoming cycle dates from current year onward
const NOW = 2026;

const UPCOMING: { year: number; type: string; action: string; color: string; desc: string }[] = [
  { year: 2026, type: 'B', action: 'SELL',      color: '#E6B450', desc: 'Good Times — High Prices. Reduce exposure, take profits.' },
  { year: 2032, type: 'C', action: 'BUY',       color: '#3B82F6', desc: 'Hard Times — Low Prices. Deploy capital. Long-term accumulation.' },
  { year: 2034, type: 'B', action: 'SELL',      color: '#E6B450', desc: 'Good Times — High Prices. Begin distribution cycle.' },
  { year: 2035, type: 'A', action: 'REDUCE',    color: '#FF5C5C', desc: 'Panic Year. Market fear peak — sharp but recoverable decline.' },
  { year: 2039, type: 'C', action: 'BUY',       color: '#3B82F6', desc: 'Hard Times — Low Prices. Prime accumulation window.' },
  { year: 2043, type: 'B', action: 'SELL',      color: '#E6B450', desc: 'Good Times — High Prices. Systematic profit-taking.' },
  { year: 2050, type: 'C', action: 'BUY',       color: '#3B82F6', desc: 'Hard Times — Low Prices. Generational buy opportunity.' },
  { year: 2053, type: 'A+B', action: 'DISTRIBUTE', color: '#F97316', desc: 'Panic + Peak coincide. Highest risk window — distribute into strength.' },
  { year: 2059, type: 'C', action: 'BUY',       color: '#3B82F6', desc: 'Hard Times — Long-term low. Full cycle completion.' },
];

const TYPE_COLOR: Record<string, string> = {
  A: '#FF5C5C', B: '#E6B450', C: '#3B82F6', 'A+B': '#F97316',
};

function YearBadge({ type }: { type: string }) {
  const color = TYPE_COLOR[type] ?? '#94A3B8';
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
      style={{ backgroundColor: color + '22', color }}
    >
      {type}
    </span>
  );
}

export default function BennerCyclePage() {
  const yearsToNextC = BUY.find(y => y > NOW);
  const yearsToNextB = SELL.find(y => y > NOW);
  const yearsToNextA = PANIC.find(y => y > NOW);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Benner Cycle"
        subtitle="Samuel Benner's 1875 commodity cycle model — panic years, peak years, and accumulation windows"
      />

      {/* Current position banner */}
      <div
        className="rounded-xl border px-5 py-4 flex flex-wrap items-center gap-6"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: '#E6B450' }}
      >
        <div>
          <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Current Position — {NOW}
          </p>
          <p className="text-base font-semibold mt-0.5" style={{ color: '#E6B450' }}>
            B Year — Good Times · High Prices
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
            {NOW} is a Sell year. Benner's model says this is a time to reduce exposure and take profits before the next hard times cycle begins in {yearsToNextC}.
          </p>
        </div>
        <div className="flex gap-6 ml-auto text-xs font-mono">
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: '#3B82F6' }}>{yearsToNextC}</p>
            <p style={{ color: 'var(--sct-muted)' }}>Next BUY</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: '#E6B450' }}>{yearsToNextB}</p>
            <p style={{ color: 'var(--sct-muted)' }}>Next SELL</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: '#FF5C5C' }}>{yearsToNextA}</p>
            <p style={{ color: 'var(--sct-muted)' }}>Next PANIC</p>
          </div>
        </div>
      </div>

      {/* Main chart card */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Benner Cycle Timeline — 1920 to 2062
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Based on Samuel Benner's 1875 cycle model · Dimmed markers = future projections
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF5C5C' }} />
              <span style={{ color: '#FF5C5C' }}>A · Panic Years</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#E6B450' }} />
              <span style={{ color: '#E6B450' }}>B · Sell / Peak</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
              <span style={{ color: '#3B82F6' }}>C · Buy / Bottom</span>
            </span>
          </div>
        </div>

        <BennerCycleChart />
      </div>

      {/* Two-column: Upcoming + Historical */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

        {/* Upcoming dates table */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Upcoming Cycle Dates
          </p>
          <div className="space-y-2.5">
            {UPCOMING.map(u => (
              <div
                key={`${u.year}-${u.type}`}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                style={{
                  backgroundColor: u.year === NOW ? u.color + '18' : 'transparent',
                  border: u.year === NOW ? `1px solid ${u.color}40` : '1px solid transparent',
                }}
              >
                <div className="text-center w-12 shrink-0">
                  <p className="text-sm font-mono font-bold" style={{ color: u.color }}>{u.year}</p>
                  <YearBadge type={u.type} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-bold tracking-widest uppercase mb-0.5"
                    style={{ color: u.color }}
                  >
                    {u.action}
                    {u.year === NOW && (
                      <span className="ml-2 px-1 py-px bg-amber-500/20 text-amber-400 rounded text-[9px] normal-case tracking-normal">
                        NOW
                      </span>
                    )}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical alignment */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Historical Alignments
          </p>
          <div className="space-y-2.5">
            {HISTORICAL.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="text-center w-12 shrink-0">
                  <p className="text-sm font-mono font-bold" style={{ color: TYPE_COLOR[h.type] }}>{h.year}</p>
                  <YearBadge type={h.type} />
                </div>
                <p className="text-xs leading-relaxed pt-0.5" style={{ color: 'var(--sct-muted)' }}>{h.event}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to read + cycle patterns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div
          className="rounded-xl border p-5 space-y-2"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: '#FF5C5C40' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF5C5C' }}>A · Panic Years</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            Years in which financial panics have occurred and are predicted to recur. The A cycle repeats on an 18–20–16 year rotation (54-year grand cycle). These are years of maximum fear — not necessarily crashes, but periods of financial stress and sharp dislocations.
          </p>
          <p className="text-[10px] font-mono" style={{ color: '#FF5C5C' }}>Pattern: 18 · 20 · 16 years</p>
        </div>
        <div
          className="rounded-xl border p-5 space-y-2"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: '#E6B45040' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#E6B450' }}>B · Peak / Sell Years</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            Years of good times, high prices, and the time to sell stocks and assets of all kinds. The B cycle repeats on a 9–10–8 year rotation (27-year cycle). These are years when valuations are stretched and distributions should begin.
          </p>
          <p className="text-[10px] font-mono" style={{ color: '#E6B450' }}>Pattern: 9 · 10 · 8 years</p>
        </div>
        <div
          className="rounded-xl border p-5 space-y-2"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: '#3B82F640' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#3B82F6' }}>C · Bottom / Buy Years</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            Years of hard times, low prices, and the best time to buy stocks and hold until the boom. The C cycle repeats on a 7–11–9 year rotation (27-year cycle). These windows have historically been the strongest long-term entry points.
          </p>
          <p className="text-[10px] font-mono" style={{ color: '#3B82F6' }}>Pattern: 7 · 11 · 9 years</p>
        </div>
      </div>

      {/* Attribution */}
      <div
        className="rounded-xl border px-5 py-4 text-xs leading-relaxed"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
      >
        <span className="font-semibold" style={{ color: 'var(--sct-text)' }}>About this model: </span>
        The Benner Cycle was published by Samuel Benner in his 1875 book <em>Benner's Prophecies of Future Ups and Downs in Prices</em>. Benner was an Ohio farmer who observed repeating cycles in commodity prices and market panics after losing his fortune in the 1873 panic. The three-cycle system — panic years (A), peak years (B), and bottom years (C) — has shown remarkable alignment with major market turning points across 150 years. It is not a trading system, but a macro timing framework for sizing positions across long time horizons.
      </div>
    </div>
  );
}
