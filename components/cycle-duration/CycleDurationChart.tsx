"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { HALVINGS } from '@/lib/indicators/halvingCycles';
import { toTs, type CycleWindow } from '@/lib/cycles/durationModel';

type PricePoint = { time: string; ts: number; price: number };

type Props = {
  prices: PricePoint[];
  cycles: CycleWindow[];
  logScale: boolean;
};

const YEAR_TICKS = Array.from({ length: 24 }, (_, i) =>
  new Date(`${2012 + i}-01-01T00:00:00Z`).getTime()
);

const GREEN = '#35D07F';
const RED = '#F85149';

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PricePoint;
  if (!d) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2.5 shadow-xl"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 170 }}
    >
      <p className="text-xs mb-1 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-sm font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
        {fmtPrice(d.price)}
      </p>
    </div>
  );
}

export function CycleDurationChart({ prices, cycles, logScale }: Props) {
  if (!prices.length) return null;

  const now = Date.now();
  const lastProjected = cycles.at(-1);
  const domainMax = Math.max(
    prices[prices.length - 1]?.ts ?? now,
    lastProjected ? toTs(lastProjected.projectedLowDate) + 30 * 86_400_000 : now,
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={prices} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {cycles.flatMap((c) => {
            const bullX1 = toTs(c.lowDate);
            const bullX2 = toTs(c.confirmedHighDate ?? c.projectedHighDate);
            const bearX1 = bullX2;
            const bearX2 = toTs(c.nextConfirmedLowDate ?? c.projectedLowDate);
            const confirmed = c.status === 'completed';

            return [
              <ReferenceArea
                key={`${c.id}-bull`}
                x1={bullX1}
                x2={bullX2}
                y1={confirmed ? c.lowPrice ?? undefined : undefined}
                y2={confirmed ? c.confirmedHighPrice ?? undefined : undefined}
                fill={GREEN}
                fillOpacity={confirmed ? 0.09 : 0.045}
                stroke={GREEN}
                strokeOpacity={confirmed ? 0.45 : 0.3}
                strokeWidth={1}
                strokeDasharray={confirmed ? undefined : '5 4'}
                label={{
                  value: confirmed ? `${c.bullDays}D BULL` : `${c.bullDays}D · PROJECTED`,
                  position: 'insideTopLeft',
                  fontSize: 9,
                  fill: GREEN,
                  fillOpacity: confirmed ? 0.8 : 0.5,
                  fontWeight: 600,
                }}
              />,
              <ReferenceArea
                key={`${c.id}-bear`}
                x1={bearX1}
                x2={bearX2}
                y1={confirmed ? c.nextConfirmedLowPrice ?? undefined : undefined}
                y2={confirmed ? c.confirmedHighPrice ?? undefined : undefined}
                fill={RED}
                fillOpacity={confirmed ? 0.08 : 0.04}
                stroke={RED}
                strokeOpacity={confirmed ? 0.45 : 0.3}
                strokeWidth={1}
                strokeDasharray={confirmed ? undefined : '5 4'}
                label={{
                  value: confirmed ? `${c.bearDays}D BEAR` : `${c.bearDays}D · PROJECTED`,
                  position: 'insideTopLeft',
                  fontSize: 9,
                  fill: RED,
                  fillOpacity: confirmed ? 0.8 : 0.5,
                  fontWeight: 600,
                }}
              />,
            ];
          })}

          {HALVINGS.filter((h) => h.ts >= (prices[0]?.ts ?? 0)).map((h) => {
            const projected = h.ts > now;
            return (
              <ReferenceLine
                key={h.label}
                x={h.ts}
                stroke={projected ? 'rgba(255,200,50,0.25)' : 'rgba(255,200,50,0.55)'}
                strokeDasharray={projected ? '6 4' : '5 3'}
                strokeWidth={1}
                label={{
                  value: h.label,
                  position: 'insideBottomLeft',
                  fontSize: 9,
                  fill: projected ? 'rgba(255,200,50,0.35)' : 'rgba(255,200,50,0.7)',
                  fontWeight: 600,
                }}
              />
            );
          })}

          {/* Current position marker */}
          <ReferenceLine
            x={now}
            stroke="#F7931A"
            strokeWidth={1.5}
            label={{
              value: 'YOU ARE HERE',
              position: 'insideTopRight',
              fontSize: 10,
              fill: '#F7931A',
              fontWeight: 700,
            }}
          />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={[prices[0]?.ts ?? 0, domainMax]}
            ticks={YEAR_TICKS}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtPrice}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={64}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--sct-border)', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="price"
            stroke="rgba(247,249,252,0.85)"
            strokeWidth={1.5}
            fill="rgba(247,249,252,0.04)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
