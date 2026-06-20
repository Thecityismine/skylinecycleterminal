"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { NUPLPoint } from '@/lib/indicators/nupl';
import { nuplSignal } from '@/lib/indicators/nupl';

// NUPLPoint includes price but NOT ma730 (computed server-side, not passed individually)
// We render price in top panel, nupl in bottom panel

type Props = { data: NUPLPoint[] };

const YEAR_TICKS = Array.from({ length: 15 }, (_, i) =>
  new Date(`${2011 + i}-01-01`).getTime(),
);

const HALVINGS = [
  { ts: new Date('2012-11-28').getTime() },
  { ts: new Date('2016-07-09').getTime() },
  { ts: new Date('2020-05-11').getTime() },
  { ts: new Date('2024-04-19').getTime() },
];

const NUPL_BANDS = [
  { y1: -1,   y2: 0,    fill: 'rgba(59,130,246,0.18)'  },
  { y1: 0,    y2: 0.35, fill: 'rgba(53,208,127,0.12)'  },
  { y1: 0.35, y2: 0.60, fill: 'rgba(163,230,53,0.10)'  },
  { y1: 0.60, y2: 0.75, fill: 'rgba(230,180,80,0.12)'  },
  { y1: 0.75, y2: 1.1,  fill: 'rgba(255,92,92,0.18)'   },
];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as NUPLPoint;
  if (!d) return null;
  const sig = nuplSignal(d.nupl);
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[190px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
            {fmtPrice(d.price)}
          </span>
        </div>
        {d.nupl != null && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>NUPL</span>
              <span className="text-xs font-mono font-medium" style={{ color: sig.color }}>
                {d.nupl.toFixed(3)}
              </span>
            </div>
            <div
              className="flex justify-between gap-4 pt-1 border-t"
              style={{ borderColor: 'var(--sct-border)' }}
            >
              <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Zone</span>
              <span className="text-xs font-medium" style={{ color: sig.color }}>
                {sig.zone}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function NUPLChart({ data }: Props) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col gap-1">
      {/* Top panel — BTC price log scale */}
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />
            {HALVINGS.map((h) => (
              <ReferenceLine key={h.ts} x={h.ts} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 5" />
            ))}
            <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
              ticks={YEAR_TICKS} tick={false} tickLine={false} axisLine={false} />
            <YAxis scale="log" domain={[100, 'auto']} tickFormatter={fmtPrice}
              tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="price" stroke="rgba(247,249,252,0.85)"
              strokeWidth={1.5} fill="rgba(247,249,252,0.04)"
              dot={false} isAnimationActive={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom panel — NUPL */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

            {NUPL_BANDS.map((b) => (
              <ReferenceArea key={b.y1} y1={b.y1} y2={b.y2} fill={b.fill} stroke="none" />
            ))}

            <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />

            {HALVINGS.map((h) => (
              <ReferenceLine key={h.ts} x={h.ts} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 5" />
            ))}

            <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
              ticks={YEAR_TICKS}
              tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
              tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} />
            <YAxis domain={[-0.5, 1.0]}
              ticks={[-0.25, 0, 0.35, 0.60, 0.75]}
              tickFormatter={(v) => v.toFixed(2)}
              tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} width={52} />

            <Tooltip content={<CustomTooltip />} />

            <Line type="monotone" dataKey="nupl" stroke="#A855F7"
              strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
