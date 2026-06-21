"use client";

import {
  ComposedChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from "recharts";
import type { DrawdownPoint } from "@/lib/indicators/drawdownFromATH";
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = {
  data:         DrawdownPoint[];
  showHalvings: boolean;
  showCycles:   boolean;
};

// Vertical halving markers
const HALVINGS = [
  { ts: new Date('2012-11-28T00:00:00Z').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09T00:00:00Z').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11T00:00:00Z').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19T00:00:00Z').getTime(), label: 'H4' },
];

// Historical bear-market bottom annotations
const BEAR_BOTTOMS = [
  { ts: new Date('2011-11-18T00:00:00Z').getTime(), label: '2011  −93.8%', y: -93.8 },
  { ts: new Date('2015-01-14T00:00:00Z').getTime(), label: '2015  −86.9%', y: -86.9 },
  { ts: new Date('2018-12-15T00:00:00Z').getTime(), label: '2018  −84.2%', y: -84.2 },
  { ts: new Date('2022-11-21T00:00:00Z').getTime(), label: '2022  −77.5%', y: -77.5 },
];

const YEAR_TICKS = Array.from({ length: 17 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime(),
);

function fmtPct(v: number): string {
  return v === 0 ? '0%' : `${v.toFixed(0)}%`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DrawdownPoint;

  const bear = BEAR_BOTTOMS.find(b => {
    const delta = Math.abs(d.ts - b.ts);
    return delta < 30 * 86_400_000;  // within 30 days of a historic bottom
  });

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-xl min-w-[200px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="font-mono mb-2" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      {bear && (
        <p className="text-[10px] mb-2 px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: '#FF5C5C15', color: '#FF5C5C' }}>
          {bear.label.trim()}
        </p>
      )}
      <div className="space-y-1 font-mono">
        {[
          { label: 'BTC Price',   val: `$${d.close.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,  color: '#F7931A' },
          { label: 'Cycle ATH',  val: `$${d.ath.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,   color: 'var(--sct-muted)' },
          { label: 'Drawdown',   val: `${d.drawdown.toFixed(1)}%`,                                          color: d.drawdown < -70 ? '#B91C1C' : d.drawdown < -50 ? '#FF5C5C' : d.drawdown < -30 ? '#F97316' : d.drawdown < -15 ? '#E6B450' : '#35D07F' },
        ].map(r => (
          <div key={r.label} className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>{r.label}</span>
            <span className="font-semibold" style={{ color: r.color }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BTCDrawdownChart({ data, showHalvings, showCycles }: Props) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

        {/* Zone bands — background color by depth */}
        <ReferenceArea y1={0}    y2={-15}  fill="rgba(53,208,127,0.05)"  stroke="none" ifOverflow="hidden" />
        <ReferenceArea y1={-15}  y2={-30}  fill="rgba(230,180,80,0.07)"  stroke="none" ifOverflow="hidden" />
        <ReferenceArea y1={-30}  y2={-50}  fill="rgba(249,115,22,0.08)"  stroke="none" ifOverflow="hidden" />
        <ReferenceArea y1={-50}  y2={-70}  fill="rgba(255,92,92,0.10)"   stroke="none" ifOverflow="hidden" />
        <ReferenceArea y1={-70}  y2={-100} fill="rgba(185,28,28,0.16)"   stroke="none" ifOverflow="hidden" />

        {/* Threshold dashed lines */}
        <ReferenceLine y={0}   stroke="rgba(247,249,252,0.15)" strokeWidth={1} />
        <ReferenceLine y={-15} stroke="rgba(53,208,127,0.25)"  strokeWidth={0.5} strokeDasharray="4 3" />
        <ReferenceLine y={-30} stroke="rgba(230,180,80,0.30)"  strokeWidth={0.5} strokeDasharray="4 3" />
        <ReferenceLine y={-50} stroke="rgba(249,115,22,0.30)"  strokeWidth={0.5} strokeDasharray="4 3" />
        <ReferenceLine y={-70} stroke="rgba(255,92,92,0.30)"   strokeWidth={0.5} strokeDasharray="4 3" />

        {/* Halving lines */}
        {showHalvings && HALVINGS.map(h => (
          <ReferenceLine
            key={h.label}
            x={h.ts}
            stroke="rgba(247,147,26,0.40)"
            strokeWidth={1}
            strokeDasharray="4 3"
            label={{
              value:     h.label,
              position:  'insideTopRight',
              fill:      'rgba(247,147,26,0.55)',
              fontSize:  9,
              fontFamily: 'var(--font-geist-mono)',
            }}
          />
        ))}

        {/* Historical bear-market bottom markers */}
        {showCycles && BEAR_BOTTOMS.map(b => (
          <ReferenceLine
            key={b.label}
            x={b.ts}
            stroke="rgba(255,92,92,0.30)"
            strokeWidth={1}
            strokeDasharray="3 3"
            label={{
              value:     b.label,
              position:  'insideTopLeft',
              fill:      'rgba(255,92,92,0.60)',
              fontSize:  9,
              fontFamily: 'var(--font-geist-mono)',
            }}
          />
        ))}

        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={YEAR_TICKS}
          tickFormatter={ts => new Date(ts).getUTCFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />

        <YAxis
          domain={[-100, 0]}
          ticks={[0, -20, -40, -60, -80, -100]}
          tickFormatter={fmtPct}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={52}
          allowDataOverflow
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Drawdown area — BTC orange fill + line */}
        <Area
          type="monotone"
          dataKey="drawdown"
          fill="rgba(247,147,26,0.09)"
          stroke="#F7931A"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          baseValue={0}
        />
      </ComposedChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
