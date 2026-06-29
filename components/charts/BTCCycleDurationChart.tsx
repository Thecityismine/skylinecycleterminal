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
  Customized,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { CycleAnchor, ActiveCyclePosition } from '@/lib/indicators/cycleAnchors';

type PricePoint = { time: string; ts: number; price: number };

type Props = {
  prices:      PricePoint[];
  anchors:     CycleAnchor[];
  activeCycle: ActiveCyclePosition;
  logScale:    boolean;
};

const YEAR_TICKS = Array.from({ length: 22 }, (_, i) =>
  new Date(`${2012 + i}-01-01T00:00:00Z`).getTime()
);

const HALVINGS = [
  { date: '2012-11-28', label: 'H1' },
  { date: '2016-07-09', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-19', label: 'H4' },
  { date: '2028-04-20', label: 'H5*' },
].map((h) => ({ ...h, ts: new Date(h.date + 'T00:00:00Z').getTime() }));

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
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

function CycleMarkerLayer({ xAxisMap, yAxisMap, anchors, prices }: any) {
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
  const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const priceMap = new Map<number, number>(
    (prices as PricePoint[]).map((p) => [p.ts, p.price])
  );
  const tsMap = new Map<string, number>(
    (prices as PricePoint[]).map((p) => [p.time, p.ts])
  );

  const elements: React.ReactElement[] = [];

  for (const anchor of anchors as CycleAnchor[]) {
    const lowTs    = tsMap.get(anchor.lowDate) ?? new Date(anchor.lowDate + 'T00:00:00Z').getTime();
    const lowPrice = priceMap.get(lowTs) ?? anchor.lowPrice;
    const cx = xAxis.scale(lowTs);
    const cy = yAxis.scale(lowPrice);

    if (isFinite(cx) && isFinite(cy) && cy > 0) {
      elements.push(
        <g key={`low-${anchor.cycleId}`}>
          <circle cx={cx} cy={cy} r={20} fill="#35D07F" opacity={0.05} />
          <circle cx={cx} cy={cy} r={12} fill="#35D07F" opacity={0.13} />
          <circle cx={cx} cy={cy} r={6}  fill="#35D07F" opacity={0.95} filter="url(#ctGlowGreen)" />
        </g>
      );
    }

    if (anchor.highDate && anchor.highPrice != null) {
      const highTs    = tsMap.get(anchor.highDate) ?? new Date(anchor.highDate + 'T00:00:00Z').getTime();
      const highPrice = priceMap.get(highTs) ?? anchor.highPrice;
      const hx = xAxis.scale(highTs);
      const hy = yAxis.scale(highPrice);

      if (isFinite(hx) && isFinite(hy) && hy > 0) {
        const s = 8;
        elements.push(
          <g key={`high-${anchor.cycleId}`}>
            <polygon
              points={`${hx},${hy - s * 1.7} ${hx - s},${hy + s * 0.7} ${hx + s},${hy + s * 0.7}`}
              fill="#F7931A"
              opacity={0.92}
              filter="url(#ctGlowAmber)"
            />
          </g>
        );
      }
    }
  }

  return (
    <g>
      <defs>
        <filter id="ctGlowGreen" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ctGlowAmber" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {elements}
    </g>
  );
}

export function BTCCycleDurationChart({ prices, anchors, activeCycle, logScale }: Props) {
  if (!prices.length) return null;

  const now     = Date.now();
  const domainMax = Math.max(
    prices[prices.length - 1]?.ts ?? now,
    activeCycle.bottomWindowEndTs + 30 * 86_400_000
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={prices} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Peak timing window */}
          <ReferenceArea
            x1={activeCycle.peakWindowStartTs}
            x2={activeCycle.peakWindowEndTs}
            fill="rgba(234,184,77,0.10)"
            stroke="rgba(234,184,77,0.30)"
            strokeWidth={0.8}
          />
          {/* Bottom timing window */}
          <ReferenceArea
            x1={activeCycle.bottomWindowStartTs}
            x2={activeCycle.bottomWindowEndTs}
            fill="rgba(91,132,255,0.10)"
            stroke="rgba(91,132,255,0.30)"
            strokeWidth={0.8}
          />

          {/* Model peak line */}
          <ReferenceLine
            x={new Date(activeCycle.projectedHighDate + 'T00:00:00Z').getTime()}
            stroke="rgba(234,184,77,0.55)"
            strokeDasharray="5 4"
            strokeWidth={1.2}
            label={{
              value:    `Day ${1064}`,
              position: 'insideTopRight',
              fontSize:  9,
              fill:     'rgba(234,184,77,0.7)',
              fontWeight: 600,
            }}
          />
          {/* Model bottom line */}
          <ReferenceLine
            x={new Date(activeCycle.projectedLowDate + 'T00:00:00Z').getTime()}
            stroke="rgba(91,132,255,0.55)"
            strokeDasharray="5 4"
            strokeWidth={1.2}
            label={{
              value:    `Day ${1428}`,
              position: 'insideTopRight',
              fontSize:  9,
              fill:     'rgba(91,132,255,0.7)',
              fontWeight: 600,
            }}
          />

          {/* Halving lines */}
          {HALVINGS.filter((h) => h.ts >= (prices[0]?.ts ?? 0)).map((h) => {
            const projected = h.ts > now;
            return (
              <ReferenceLine
                key={h.label}
                x={h.ts}
                stroke={projected ? 'rgba(255,200,50,0.25)' : 'rgba(255,200,50,0.60)'}
                strokeDasharray={projected ? '6 4' : '5 3'}
                strokeWidth={1.2}
                label={{
                  value:    h.label,
                  position: 'insideTopLeft',
                  fontSize: 9,
                  fill:     projected ? 'rgba(255,200,50,0.35)' : 'rgba(255,200,50,0.75)',
                  fontWeight: 600,
                }}
              />
            );
          })}

          {/* Now */}
          <ReferenceLine
            x={now}
            stroke="rgba(247,249,252,0.35)"
            strokeDasharray="2 4"
            label={{ value: 'Now', position: 'insideTopRight', fontSize: 10, fill: 'rgba(247,249,252,0.45)' }}
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
            stroke="rgba(247,249,252,0.82)"
            strokeWidth={1.5}
            fill="rgba(247,249,252,0.04)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          <Customized
            component={(props: any) => (
              <CycleMarkerLayer {...props} anchors={anchors} prices={prices} />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
