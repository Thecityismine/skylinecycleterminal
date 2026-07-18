"use client";

import { ComposedChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';

type OscPoint = { ts: number; time: string; a: number | null; b?: number | null };

type Props = {
  data:    OscPoint[];
  label:   string;
  colorA:  string;
  colorB?: string;
  labelA?: string;
  labelB?: string;
  domain?: [number | 'auto', number | 'auto'];
};

type OscTooltipProps = {
  active?:  boolean;
  payload?: { payload: OscPoint }[];
  colorA:   string;
  colorB?:  string;
  labelA?:  string;
  labelB?:  string;
};

function OscTooltip({ active, payload, colorA, colorB, labelA, labelB }: OscTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border px-3 py-2 shadow-xl space-y-0.5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-xs font-mono" style={{ color: colorA }}>{labelA}: {d.a != null ? d.a.toFixed(1) : '—'}</p>
      {colorB && <p className="text-xs font-mono" style={{ color: colorB }}>{labelB}: {d.b != null ? d.b.toFixed(1) : '—'}</p>}
    </div>
  );
}

export function RotationOscillatorPanel({ data, label, colorA, colorB, labelA, labelB, domain = ['auto', 'auto'] }: Props) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wider uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>{label}</p>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
            <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} hide />
            <YAxis
              domain={domain}
              tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} width={40}
            />
            <ReferenceLine y={0} stroke="var(--sct-border)" />
            <Tooltip content={<OscTooltip colorA={colorA} colorB={colorB} labelA={labelA ?? label} labelB={labelB} />} />
            <Line type="monotone" dataKey="a" stroke={colorA} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
            {colorB && <Line type="monotone" dataKey="b" stroke={colorB} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
