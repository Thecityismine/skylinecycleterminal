"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from "recharts";
import { fgColor } from "@/lib/api/feargreed";

export type FGCombinedPoint = {
  time:    string;
  ts:      number;
  price:   number | null;
  fg:      number | null;
  fgClass: string;
};

type Props = { data: FGCombinedPoint[] };

const LOG_TICKS = [1_000, 5_000, 10_000, 30_000, 70_000, 150_000];

function buildYearTicks(data: FGCombinedPoint[]): number[] {
  if (!data.length) return [];
  const startYear = new Date(data[0].ts).getUTCFullYear();
  const endYear   = new Date(data.at(-1)!.ts).getUTCFullYear() + 1;
  return Array.from({ length: endYear - startYear + 1 }, (_, i) =>
    new Date(`${startYear + i}-01-01T00:00:00Z`).getTime(),
  );
}

function CombinedTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as FGCombinedPoint;
  const color = d.fg != null ? fgColor(d.fg) : 'var(--sct-muted)';
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-xl min-w-[200px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="font-mono mb-2" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1 font-mono">
        {d.price != null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
            <span className="font-semibold" style={{ color: '#F7931A' }}>
              ${d.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
        {d.fg != null && (
          <>
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--sct-muted)' }}>Fear & Greed</span>
              <span className="font-semibold" style={{ color }}>{d.fg}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--sct-muted)' }}>Signal</span>
              <span style={{ color }}>{d.fgClass}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function FearGreedChart({ data }: Props) {
  const minTs    = data[0]?.ts ?? 0;
  const maxTs    = data.at(-1)?.ts ?? Date.now();
  const yearTicks = buildYearTicks(data);

  const xCommon = {
    dataKey:       'ts' as const,
    type:          'number' as const,
    scale:         'time'  as const,
    domain:        [minTs, maxTs] as [number, number],
    ticks:         yearTicks,
  };

  return (
    <div className="flex flex-col">
      {/* ── BTC price panel ─────────────────────────────────────────────── */}
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} syncId="fg-chart" margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

            <XAxis
              {...xCommon}
              tick={false}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
            />
            <YAxis
              scale="log"
              domain={[1_000, 'auto']}
              ticks={LOG_TICKS}
              tickFormatter={v => v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v}`}
              tick={{ fill: 'var(--sct-muted)', fontSize: 10, fontFamily: 'var(--font-geist-mono)' }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              width={58}
              allowDataOverflow
            />

            {/* Suppress tooltip on top panel — bottom panel carries it */}
            <Tooltip content={() => null} />

            <Line
              type="monotone"
              dataKey="price"
              stroke="rgba(247,249,252,0.85)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── F&G oscillator panel ─────────────────────────────────────────── */}
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} syncId="fg-chart" margin={{ top: 0, right: 12, bottom: 0, left: 4 }}>
            {/* Zone color bands — from bottom to top */}
            <ReferenceArea y1={0}  y2={25}  fill="rgba(153,27,27,0.55)"  stroke="none" ifOverflow="hidden" />
            <ReferenceArea y1={25} y2={50}  fill="rgba(161,98,7,0.38)"   stroke="none" ifOverflow="hidden" />
            <ReferenceArea y1={50} y2={75}  fill="rgba(22,101,52,0.30)"  stroke="none" ifOverflow="hidden" />
            <ReferenceArea y1={75} y2={100} fill="rgba(21,128,61,0.55)"  stroke="none" ifOverflow="hidden" />

            {/* Zone boundary lines */}
            <ReferenceLine y={25} stroke="rgba(247,249,252,0.08)" strokeWidth={1} />
            <ReferenceLine y={50} stroke="rgba(247,249,252,0.08)" strokeWidth={1} />
            <ReferenceLine y={75} stroke="rgba(247,249,252,0.08)" strokeWidth={1} />

            <XAxis
              {...xCommon}
              tickFormatter={ts => new Date(ts).getUTCFullYear().toString()}
              tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={v =>
                v === 0    ? 'Ext Fear' :
                v === 25   ? 'Fear'     :
                v === 50   ? 'Neutral'  :
                v === 75   ? 'Greed'    :
                             'Ext Greed'
              }
              tick={{ fill: 'rgba(247,249,252,0.40)', fontSize: 9, fontFamily: 'var(--font-geist-mono)' }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              width={58}
            />

            <Tooltip content={<CombinedTooltip />} />

            <Line
              type="monotone"
              dataKey="fg"
              stroke="rgba(247,249,252,0.88)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
