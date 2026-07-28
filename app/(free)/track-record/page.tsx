"use client";

import { Download, TriangleAlert, Check, X } from 'lucide-react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { ScoreHistoryChart, type ChartMarker } from '@/components/charts/ScoreHistoryChart';
import type { HistoricalScorePoint } from '@/lib/indicators/historicalScore';
import type { TrackRecord } from '@/lib/indicators/trackRecord';

// The point of this page is that the misses are as visible as the hits. Any
// future edit that buries a miss defeats the reason it exists.

type TrackRecordResponse = TrackRecord & {
  series:       HistoricalScorePoint[];
  mode:         string;
  historyStart: string;
};

const INDICATORS = [
  'Pi Cycle Top ratio — 111DMA / (2 × 350DMA)',
  'MVRV proxy — price / 200DMA',
  '2Y MA Multiplier — price / 730DMA',
  'Log Regression — price / power-law fair value',
];

const fmtUSD = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

function downloadCsv(series: HistoricalScorePoint[]) {
  const rows = [
    'date,score,zone,btc_close',
    ...series.map((p) => `${p.time},${p.score},${p.zone},${p.btcClose}`),
  ].join('\n');
  const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'skyline-cycle-score-history.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function TrackRecordPage() {
  const { data, loading, error } = useApiData<TrackRecordResponse>('/api/track-record');

  const markers: ChartMarker[] =
    data?.readings.map((r) => ({
      ts:    new Date(r.date + 'T00:00:00').getTime(),
      label: r.kind === 'top' ? 'Top' : 'Bottom',
      color: r.kind === 'top' ? 'rgba(255,92,92,0.55)' : 'rgba(59,130,246,0.55)',
    })) ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Cycle Score Track Record"
        subtitle="What the Skyline Cycle Score read at every Bitcoin cycle top and bottom — including where it fell short"
      />

      {error && (
        <div
          className="rounded-xl border p-5 text-sm"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', color: 'var(--sct-secondary)' }}
        >
          The track record is temporarily unavailable. It rebuilds from live price history, so this is
          usually a data-source hiccup rather than a change in the numbers.
        </div>
      )}

      {loading && !data && <ChartSkeleton height="h-64" />}

      {data && (
        <>
          {/* Headline verdict */}
          <div
            className="rounded-xl border p-6 sm:p-8"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
              <span className="text-5xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
                {data.hits}<span style={{ color: 'var(--sct-muted)' }}>/{data.total}</span>
              </span>
              <span className="text-base" style={{ color: 'var(--sct-secondary)' }}>
                turning points landed in the zone you would want
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-3xl" style={{ color: 'var(--sct-muted)' }}>
              Every reading below is computed point-in-time: on each date the model is ranked only
              against data that existed up to that day. No future information is used anywhere on
              this page. The full daily series is downloadable at the bottom.
            </p>
          </div>

          {/* The miss leads — before the table, not buried under it */}
          {data.misses.length > 0 && (
            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: 'rgba(230,180,80,0.06)', borderColor: 'rgba(230,180,80,0.35)' }}
            >
              <p className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: 'var(--sct-amber)' }}>
                <TriangleAlert size={15} />
                Where it fell short
              </p>
              <div className="space-y-3">
                {data.misses.map((m) => (
                  <p key={m.date} className="text-sm leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
                    At the <strong>{fmtDate(m.date)}</strong> cycle {m.kind} ({fmtUSD(m.price)}), the score read{' '}
                    <strong style={{ color: m.zoneColor }}>{m.score} — {m.zoneLabel}</strong>. A model doing its job
                    here would have reached <strong>{m.expectedLabel}</strong>, and it did not.
                    {m.nearby && m.nearby.date !== m.date && (
                      <> Its most extreme reading within 30 days was {m.nearby.score}, on {fmtDate(m.nearby.date)}.</>
                    )}
                  </p>
                ))}
              </div>
              <p className="text-xs leading-relaxed mt-4 pt-4" style={{ color: 'var(--sct-muted)', borderTop: '1px solid rgba(230,180,80,0.25)' }}>
                The Cycle Score is a position read, not a top-caller. A high reading says the market is
                historically extended, not that a top is imminent — and this is what that distinction
                costs in practice.
              </p>
            </div>
          )}

          {/* Readings table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
                    {['Turning point', 'Date', 'BTC', 'Score', 'Zone read', 'Expected', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left font-medium text-[11px] uppercase tracking-wider px-4 py-3"
                        style={{ color: 'var(--sct-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.readings.map((r) => (
                    <tr key={r.date} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                      <td className="px-4 py-3.5" style={{ color: 'var(--sct-text)' }}>
                        <span className="font-medium">Cycle {r.kind}</span>
                        <span className="block text-[11px]" style={{ color: 'var(--sct-muted)' }}>{r.cycle}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--sct-secondary)' }}>
                        {fmtDate(r.date)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--sct-secondary)' }}>
                        {fmtUSD(r.price)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-lg" style={{ color: r.zoneColor }}>
                        {r.score}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium" style={{ color: r.zoneColor }}>
                        {r.zoneLabel}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--sct-muted)' }}>
                        {r.expectedLabel}
                      </td>
                      <td className="px-4 py-3.5">
                        {r.hit
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--sct-green)' }}><Check size={13} />Hit</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--sct-amber)' }}><X size={13} />Miss</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Series chart */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
                Point-in-time score vs BTC price
              </p>
              <button
                onClick={() => downloadCsv(data.series)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium border transition-colors"
                style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
              >
                <Download size={12} />
                Download CSV
              </button>
            </div>
            <div style={{ height: 420 }}>
              {data.series.length
                ? <ScoreHistoryChart points={data.series} markers={markers} />
                : <ChartSkeleton height="h-full" />}
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--sct-muted)' }}>
              Dashed verticals mark cycle tops (red) and bottoms (blue). Faint verticals mark Bitcoin
              halvings. Orange line = BTC price, log scale, right axis.
            </p>
          </div>

          {/* Methodology — the part that makes the rest checkable */}
          <div
            className="rounded-xl border p-6"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
              How these numbers are produced
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              <div>
                <p className="font-medium mb-1.5" style={{ color: 'var(--sct-secondary)' }}>
                  This is a price-structure proxy, not the live 11-indicator score
                </p>
                <p>
                  The live Skyline Cycle Score reads 11 indicators. Only four can be reconstructed
                  across full history from price alone — Fear &amp; Greed data begins in 2018, and the
                  on-chain series have their own start dates, so a true 11-indicator backtest of the
                  2015 and 2017 turns is not possible. These four are what the historical series uses:
                </p>
                <ul className="mt-2 space-y-1">
                  {INDICATORS.map((i) => (
                    <li key={i} className="font-mono text-[11px]" style={{ color: 'var(--sct-secondary)' }}>· {i}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="font-medium mb-1.5" style={{ color: 'var(--sct-secondary)' }}>
                    Point-in-time normalization
                  </p>
                  <p>
                    Each indicator is percentile-ranked against its own history up to that date only.
                    Ranking against the complete series instead would be hindsight — it would let a
                    2017 reading use 2026 data. It also flatters the result: on this same data the
                    hindsight method scores the 2021 top at 75, which would convert the miss above
                    into a fifth hit and show a perfect record. That is exactly why it is not used here.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1.5" style={{ color: 'var(--sct-secondary)' }}>
                    Reference window and turning points
                  </p>
                  <p>
                    History starts {fmtDate(data.historyStart)}, and the window is part of the method —
                    a percentile is always relative to some reference set. Extending the start back to
                    2010 moves these five readings by at most 3 points and changes none of their zones,
                    so nothing here hinges on that choice. Turning-point dates are the cycle highs and
                    lows Skyline uses throughout the terminal; the 2021 top is dated to the November
                    all-time high.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed mt-6 pt-5" style={{ color: 'var(--sct-muted)', borderTop: '1px solid var(--sct-border)' }}>
              Past readings describe historical model behaviour. They are not a forecast of the current
              cycle, not a prediction of any future top or bottom, and not financial advice.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
