"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { SEGMENT_COLOR, type CyclePoint, type CycleSegment } from '@/lib/indicators/housingCycle';

// The long housing cycle, drawn in real terms.
//
// The bands are not annotations. They come out of detectCycleSegments(), which
// walks the running real peak — so what is shaded is what the series actually
// did, and if the data revises, the bands move with it.

type Props = {
  data:      CyclePoint[];
  segments:  CycleSegment[];
  /** Deflated by CPI when true, as-published when false. */
  real:      boolean;
  showBands: boolean;
};

const BAND_OPACITY: Record<string, number> = {
  contraction: 0.14,
  recovery:    0.07,
  expansion:   0,
};

type Row = CyclePoint;

function CustomTooltip({
  active, payload, real, segments,
}: {
  active?:   boolean;
  payload?:  Array<{ payload: Row }>;
  real:      boolean;
  segments:  CycleSegment[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  const seg = segments.find((s) => d.ts >= s.startTs && d.ts <= s.endTs);
  const label = new Date(d.ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', timeZone: 'UTC',
  });

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-xl min-w-[190px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="font-mono mb-2" style={{ color: 'var(--sct-muted)' }}>{label}</p>

      {seg && (
        <p
          className="text-[10px] mb-2 px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${SEGMENT_COLOR[seg.kind]}18`, color: SEGMENT_COLOR[seg.kind] }}
        >
          {seg.label}
        </p>
      )}

      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--sct-muted)' }}>
            {real ? 'Index, today’s $' : 'Index, as published'}
          </span>
          <span className="font-mono font-semibold" style={{ color: 'rgba(247,249,252,0.9)' }}>
            {(real ? d.real : d.nominal).toFixed(1)}
          </span>
        </div>
        {real && (
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>From real peak</span>
            <span
              className="font-mono font-semibold"
              style={{ color: d.drawdown < -1 ? '#FF5C5C' : '#35D07F' }}
            >
              {d.drawdown.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function HousingCycleChart({ data, segments, real, showBands }: Props) {
  if (!data.length) return null;

  const key = real ? 'real' : 'nominal';
  const last = data[data.length - 1];

  // Decade gridlines across whatever span the data covers. Anchored to the
  // series rather than to the clock, so this stays pure across renders.
  const firstYear = new Date(data[0].ts).getUTCFullYear();
  const lastYear  = new Date(last.ts).getUTCFullYear();
  const yearTicks: number[] = [];
  for (let y = Math.ceil(firstYear / 5) * 5; y <= lastYear; y += 5) {
    yearTicks.push(new Date(`${y}-01-01T00:00:00Z`).getTime());
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {showBands && segments
            .filter((s) => BAND_OPACITY[s.kind] > 0)
            .map((s) => (
              <ReferenceArea
                key={`${s.kind}-${s.startTs}`}
                x1={s.startTs}
                x2={s.endTs}
                fill={SEGMENT_COLOR[s.kind]}
                fillOpacity={BAND_OPACITY[s.kind]}
                stroke="none"
              />
            ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts: number) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
            stroke="rgba(38,50,65,0.6)"
            minTickGap={16}
          />
          <YAxis
            dataKey={key}
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
            stroke="rgba(38,50,65,0.6)"
            width={44}
            tickFormatter={(v: number) => v.toFixed(0)}
          />

          {/* The real peak. In real terms this line is the one that matters:
              every point below it is a buyer who has not broken even. */}
          {real && (
            <ReferenceLine
              y={Math.max(...data.map((d) => d.real))}
              stroke="#F97316"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />
          )}

          <Tooltip content={<CustomTooltip real={real} segments={segments} />} />

          <Line
            type="monotone"
            dataKey={key}
            stroke="#22D3EE"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
