"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

type SpreadPoint = { time: string; ts: number; spread: number | null };

type Props = {
  data:    SpreadPoint[];
  startTs: number;
};

const YEAR_TICKS = Array.from({ length: 20 }, (_, i) =>
  new Date(`${2011 + i}-01-01T00:00:00Z`).getTime()
);

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as SpreadPoint;
  if (!d || d.spread === null) return null;
  const pos = d.spread >= 0;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-xl"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs font-mono mb-1" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-sm font-mono font-bold" style={{ color: pos ? '#35D07F' : '#F85149' }}>
        {d.spread > 0 ? '+' : ''}{d.spread.toFixed(2)}%
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
        {pos ? 'Golden Cross regime' : 'Death Cross regime'}
      </p>
    </div>
  );
}

export function MASpreadChart({ data, startTs }: Props) {
  if (!data.length) return null;

  const visible = data.filter((p) => p.ts >= startTs && p.spread !== null);
  const yearTicks = YEAR_TICKS.filter((t) => t >= startTs);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={visible} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

        <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />

        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={yearTicks}
          tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={46}
        />

        <Tooltip content={<CustomTooltip />} />

        <Bar
          dataKey="spread"
          isAnimationActive={false}
          fill="#35D07F"
          // Color each bar based on value sign
          shape={(props: any) => {
            const { x, y, width, height, value } = props;
            if (value === null) return <g />;
            const fill = value >= 0 ? 'rgba(53,208,127,0.55)' : 'rgba(248,81,73,0.55)';
            const stroke = value >= 0 ? 'rgba(53,208,127,0.85)' : 'rgba(248,81,73,0.85)';
            return (
              <rect
                x={x}
                y={y}
                width={Math.max(width, 1)}
                height={Math.abs(height)}
                fill={fill}
                stroke={stroke}
                strokeWidth={0}
              />
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
