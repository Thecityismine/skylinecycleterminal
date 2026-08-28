"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea,
} from "recharts";
import type { RealizedVolPoint } from "@/lib/indicators/realizedVolatility";
import { ChartWatermark } from "@/components/charts/ChartWatermark";

type Props = {
  data:        RealizedVolPoint[];
  showPrice:   boolean;
  show90:      boolean;
  longRunMean: number | null;
  /** rv30 value at the 15th percentile — the compression threshold. */
  compressedAt: number | null;
};

const HALVINGS = [
  { ts: new Date('2012-11-28T00:00:00Z').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09T00:00:00Z').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11T00:00:00Z').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19T00:00:00Z').getTime(), label: 'H4' },
];

const YEAR_TICKS = Array.from({ length: 17 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime(),
);

// Typed rather than `any`. Recharts passes its own loose shape here, so only the
// two fields actually read are declared.
type TooltipProps = {
  active?:  boolean;
  payload?: { payload: RealizedVolPoint }[];
};

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const rows = [
    { label: '30d Realized Vol', val: d.rv30 != null ? `${d.rv30.toFixed(1)}%` : '—', color: '#38BDF8' },
    { label: '90d Realized Vol', val: d.rv90 != null ? `${d.rv90.toFixed(1)}%` : '—', color: '#A78BFA' },
    { label: 'BTC Price',        val: `$${d.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: '#F7931A' },
  ];

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-xl min-w-[210px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="font-mono mb-2" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1 font-mono">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>{r.label}</span>
            <span style={{ color: r.color }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RealizedVolChart({ data, showPrice, show90, longRunMean, compressedAt }: Props) {
  return (
    <div className="relative w-full h-full">
      <ChartWatermark />
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 60, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--sct-border)" opacity={0.35} />

          {/* Compression band — everything below the 15th-percentile threshold. */}
          {compressedAt != null && (
            <ReferenceArea
              yAxisId="vol"
              y1={0}
              y2={compressedAt}
              fill="#35D07F"
              fillOpacity={0.09}
            />
          )}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={YEAR_TICKS}
            tickFormatter={(ts: number) => new Date(ts).getUTCFullYear().toString()}
            stroke="var(--sct-muted)"
            tick={{ fontSize: 11, fontFamily: 'monospace' }}
          />

          <YAxis
            yAxisId="vol"
            orientation="left"
            domain={[0, 200]}
            allowDataOverflow
            tickFormatter={(v: number) => `${v}%`}
            stroke="var(--sct-muted)"
            tick={{ fontSize: 11, fontFamily: 'monospace' }}
            width={48}
          />

          {showPrice && (
            <YAxis
              yAxisId="price"
              orientation="right"
              scale="log"
              domain={['auto', 'auto']}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
              }
              stroke="#F7931A"
              tick={{ fontSize: 10, fontFamily: 'monospace' }}
              width={52}
            />
          )}

          <Tooltip content={<CustomTooltip />} />

          {/* Long-run average reference */}
          {longRunMean != null && (
            <ReferenceLine
              yAxisId="vol"
              y={longRunMean}
              stroke="var(--sct-muted)"
              strokeDasharray="4 4"
              label={{
                value: `Long-run avg ${longRunMean.toFixed(0)}%`,
                position: 'insideTopLeft',
                fill: 'var(--sct-muted)',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />
          )}

          {HALVINGS.map(h => (
            <ReferenceLine
              key={h.label}
              yAxisId="vol"
              x={h.ts}
              stroke="#F7931A"
              strokeDasharray="2 4"
              strokeOpacity={0.55}
            />
          ))}

          {showPrice && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#F7931A"
              strokeWidth={1}
              strokeOpacity={0.45}
              dot={false}
              isAnimationActive={false}
            />
          )}

          {show90 && (
            <Line
              yAxisId="vol"
              type="monotone"
              dataKey="rv90"
              stroke="#A78BFA"
              strokeWidth={1.4}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}

          <Line
            yAxisId="vol"
            type="monotone"
            dataKey="rv30"
            stroke="#38BDF8"
            strokeWidth={1.6}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
