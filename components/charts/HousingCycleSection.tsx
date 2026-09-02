"use client";

import { useState } from 'react';
import { HousingCycleChart } from '@/components/charts/HousingCycleChart';
import {
  ChartControlBar, ChartControlGroup, ChartLegendItem,
  ChartToggleButton, ChartPeriodButton,
} from '@/components/charts/ChartControls';
import {
  SEGMENT_COLOR, type CyclePoint, type CycleSegment, type CyclePosition,
} from '@/lib/indicators/housingCycle';

// The real/nominal toggle is the teaching device on this page, not a preference.
//
// Nominal is offered specifically so it can be switched away from: on the
// nominal axis the 2006 top is a shallow dip and 1990 is invisible, which is the
// chart most people have in their heads. One click deflates it and the same
// series shows a fifteen-year round trip. Nominal is therefore the option, and
// real is the default.

type Props = {
  data:     CyclePoint[];
  segments: CycleSegment[];
  position: CyclePosition | null;
};

export function HousingCycleSection({ data, segments, position }: Props) {
  const [real, setReal]           = useState(true);
  const [showBands, setShowBands] = useState(true);
  const [years, setYears]         = useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="text-sm" style={{ color: 'var(--sct-muted)' }}>
        Case-Shiller or CPI is unavailable, so the cycle chart cannot be drawn.
      </div>
    );
  }

  // Windowed off the last data point rather than the clock. Reading Date.now()
  // during render is impure and the lint rule that catches it is correct to.
  const lastTs = data[data.length - 1].ts;
  const cutoff = years == null ? -Infinity : lastTs - years * 365.25 * 864e5;
  const view   = years == null ? data : data.filter((d) => d.ts >= cutoff);
  const segsInView = segments.filter((s) => s.endTs >= cutoff);

  const contractions = segments.filter((s) => s.kind === 'contraction');

  return (
    <div className="space-y-4">
      <ChartControlBar>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            The long housing cycle
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
            Case-Shiller national{real ? ', deflated by CPI to today’s dollars' : ', as published'}.
            Shaded periods are detected from the series, not supplied.
          </p>
        </div>

        <ChartControlGroup>
          <ChartToggleButton
            active={real}
            label={real ? 'Real' : 'Nominal'}
            color="#22D3EE"
            onClick={() => setReal((v) => !v)}
          />
          <ChartToggleButton
            active={showBands}
            label="Phases"
            color="#FF5C5C"
            onClick={() => setShowBands((v) => !v)}
          />
          {([['All', null], ['20Y', 20], ['10Y', 10], ['5Y', 5]] as const).map(([label, y]) => (
            <ChartPeriodButton
              key={label}
              active={years === y}
              label={label}
              onClick={() => setYears(y)}
            />
          ))}
        </ChartControlGroup>
      </ChartControlBar>

      <div className="h-[340px] sm:h-[420px]">
        <HousingCycleChart data={view} segments={segsInView} real={real} showBands={showBands} />
      </div>

      <ChartControlGroup>
        <ChartLegendItem color={SEGMENT_COLOR.contraction} label="Contraction" />
        <ChartLegendItem color={SEGMENT_COLOR.recovery}    label="Below prior real peak" />
        {real && <ChartLegendItem color="#F97316" label="Real all-time peak" />}
      </ChartControlGroup>

      {/* What the bands measure, stated as numbers. The recovery column is the
          one that changes minds — it is the wait to break even in purchasing
          power, and it is not visible anywhere on a nominal chart. */}
      {contractions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left  font-normal py-2 pr-4">Cycle</th>
                <th className="text-right font-normal py-2 pr-4">Real decline</th>
                <th className="text-right font-normal py-2 pr-4">Peak → trough</th>
                <th className="text-right font-normal py-2">Peak → break-even</th>
              </tr>
            </thead>
            <tbody>
              {contractions.map((c) => {
                const rec = segments.find(
                  (s) => s.kind === 'recovery' && s.startTs === c.endTs,
                );
                const yrs = (a: number, b: number) => ((b - a) / (365.25 * 864e5)).toFixed(1);
                const done = rec?.label.startsWith('Recovery');
                return (
                  <tr key={c.startTs} style={{ borderTop: '1px solid var(--sct-border)' }}>
                    <td className="py-2 pr-4" style={{ color: 'var(--sct-text)' }}>
                      {c.start.slice(0, 4)} peak
                    </td>
                    <td className="py-2 pr-4 text-right" style={{ color: '#FF5C5C' }}>
                      {c.depth != null ? `${c.depth.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 pr-4 text-right" style={{ color: 'var(--sct-muted)' }}>
                      {yrs(c.startTs, c.endTs)}y
                    </td>
                    <td className="py-2 text-right" style={{ color: done ? 'var(--sct-text)' : '#E6B450' }}>
                      {rec ? `${yrs(c.startTs, rec.endTs)}y${done ? '' : ' — ongoing'}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {position && (
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-card)' }}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              Current phase, derived from conditions
            </span>
            <span className="text-sm font-semibold" style={{ color: position.color }}>
              {position.name}
            </span>
          </div>

          <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {position.evidence.map((e) => (
              <div key={e.label} className="flex justify-between gap-3 text-xs">
                <span style={{ color: 'var(--sct-muted)' }}>
                  <span style={{ color: e.supports ? position.color : 'var(--sct-muted)' }}>
                    {e.supports ? '✓' : '·'}
                  </span>{' '}
                  {e.label}
                </span>
                <span className="font-mono" style={{ color: 'var(--sct-text)' }}>{e.value}</span>
              </div>
            ))}
          </div>

          <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--sct-text)' }}>
            {position.read}
          </p>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            {position.nextSignal}
          </p>
        </div>
      )}
    </div>
  );
}
