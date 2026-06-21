"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { RatioPoint, RatioKey } from '@/lib/api/ratios';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = {
  data:     RatioPoint[];
  ratioKey: RatioKey;
  logScale: boolean;
};

const COLORS: Record<RatioKey, { stroke: string; fill: string }> = {
  btc_ixic: { stroke: '#F7931A', fill: 'rgba(247,147,26,0.12)' },
  btc_spx:  { stroke: '#53A7FF', fill: 'rgba(83,167,255,0.12)' },
  eth_ixic: { stroke: '#9B8CFF', fill: 'rgba(155,140,255,0.12)' },
  btc_eth:  { stroke: '#35D07F', fill: 'rgba(53,208,127,0.10)' },
  eth_btc:  { stroke: '#A78BFA', fill: 'rgba(167,139,250,0.10)' },
};

const HALVINGS = [
  { ts: new Date('2016-07-09').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19').getTime(), label: 'H4' },
];

const YEAR_TICKS = Array.from({ length: 13 }, (_, i) =>
  new Date(`${2014 + i}-01-01`).getTime(),
);

function fmtRatio(v: number): string {
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(6);
}

function CustomTooltip({ active, payload, ratioKey }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as RatioPoint;
  if (!d) return null;
  const col = COLORS[ratioKey as RatioKey];
  const labels: Record<RatioKey, [string, string]> = {
    btc_ixic: ['Bitcoin', 'Nasdaq'],
    btc_spx:  ['Bitcoin', 'S&P 500'],
    eth_ixic: ['Ethereum', 'Nasdaq'],
    btc_eth:  ['Bitcoin', 'ETH'],
    eth_btc:  ['Ethereum', 'BTC'],
  };
  const [top, btm] = labels[ratioKey as RatioKey];
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[180px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>{top}/{btm}</span>
          <span className="text-xs font-mono font-semibold" style={{ color: col.stroke }}>
            {fmtRatio(d.value)}
          </span>
        </div>
        <p className="text-[10px] pt-1" style={{ color: 'var(--sct-muted)' }}>
          1 {top} = {fmtRatio(d.value)} {btm} pts
        </p>
      </div>
    </div>
  );
}

export function RatioChart({ data, ratioKey, logScale }: Props) {
  if (!data.length) return null;
  const col = COLORS[ratioKey];

  const yDomain: [number | string, number | string] = logScale
    ? ['auto', 'auto']
    : ['auto', 'auto'];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

        {HALVINGS.map((h) => (
          <ReferenceLine
            key={h.ts} x={h.ts}
            stroke="rgba(255,200,50,0.35)" strokeDasharray="4 6"
            label={{ value: h.label, position: 'insideTopRight', fontSize: 10, fill: 'rgba(255,200,50,0.6)' }}
          />
        ))}

        <XAxis
          dataKey="ts" type="number" scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={YEAR_TICKS}
          tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false}
        />
        <YAxis
          scale={logScale ? 'log' : 'linear'}
          domain={yDomain}
          allowDataOverflow
          tickFormatter={fmtRatio}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false}
          width={60}
        />

        <Tooltip content={<CustomTooltip ratioKey={ratioKey} />} />

        <Area
          type="monotone" dataKey="value"
          stroke={col.stroke} strokeWidth={2}
          fill={col.fill}
          dot={false} isAnimationActive={false} connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
