"use client";

import {
  ComposedChart, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import { DeviationColorLine, downsampleValuationPoints } from '@/components/charts/ValuationDeviationChart';
import { HALVINGS } from '@/lib/indicators/halvingCycles';
import { halvingColor, ZONE_META } from '@/lib/indicators/valuationCycle';
import type { ValuationPoint } from '@/lib/indicators/valuationCycle';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type ValuationDeviationSharePayload = {
  points:      ValuationPoint[];
  startTs:     number;
  rangeLabel:  string;
  generatedAt: string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const VALUATION_DEVIATION_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

const YEAR_TICKS = Array.from({ length: 20 }, (_, i) =>
  new Date(`${2011 + i}-01-01T00:00:00Z`).getTime(),
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`;
}

const LEGEND_STOPS = [0, 350, 700, 1050, 1400];

export function ValuationDeviationShareCard({ payload }: { payload: ValuationDeviationSharePayload }) {
  const { points, startTs, rangeLabel, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const chartData = downsampleValuationPoints(points.filter((p) => p.ts >= startTs), 1500);
  const current   = points[points.length - 1] ?? null;
  const zone      = current?.zone ? ZONE_META[current.zone] : null;

  const deviations = chartData.map((p) => p.deviation).filter((v): v is number => v != null);
  const yMin = Math.min(-0.5, ...deviations, 0);
  const yMax = Math.max(1.5, ...deviations);
  const now = Date.now();

  const stats = [
    { label: 'BTC Price',       value: current ? fmtPrice(current.close) : '—',                          sub: 'Latest close',            color: '#E6EDF3' },
    { label: '200D MA',         value: current?.ma200 != null ? fmtPrice(current.ma200) : '—',            sub: 'Trend baseline',           color: '#5B84FF' },
    { label: 'Deviation',       value: current?.deviation != null ? fmtPct(current.deviation) : '—',      sub: 'Price vs 200D MA',          color: zone?.color ?? '#E6EDF3' },
    { label: 'Days to Halving', value: current?.daysUntilNextHalving != null ? String(current.daysUntilNextHalving) : '—', sub: zone?.label ?? '—', color: current ? halvingColor(current.daysUntilNextHalving) : '#8B949E' },
  ];

  const gradient = LEGEND_STOPS.map((d) => halvingColor(d)).join(', ');

  return (
    <div style={{
      width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, backgroundColor: '#0D1117',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      display: 'flex', flexDirection: 'column', padding: PAD, boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ height: HEADER_H, flex: `0 0 ${HEADER_H}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>Bitcoin Cycle Valuation</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            Price deviation from 200-day trend · {rangeLabel === 'All' ? 'Full history' : rangeLabel}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
              {rangeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ height: STATS_H, flex: `0 0 ${STATS_H}px`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: GAP, marginBottom: GAP }}>
        {stats.map((s) => (
          <div key={s.label} style={{ backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart data={chartData} width={CHART_W} height={CHART_H} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          <ReferenceArea y1={yMin} y2={0.05} fill="rgba(53,208,127,0.08)" stroke="none" />
          <ReferenceArea y1={1.00} y2={yMax} fill="rgba(248,81,73,0.08)" stroke="none" />

          <ReferenceLine y={0} stroke="rgba(91,132,255,0.5)" strokeDasharray="4 3"
            label={{ value: '200D MA', position: 'insideBottomLeft', fontSize: 10, fill: 'rgba(91,132,255,0.7)' }} />
          <ReferenceLine y={1.0} stroke="rgba(248,81,73,0.45)" strokeDasharray="4 3"
            label={{ value: 'Sell Zone', position: 'insideTopLeft', fontSize: 10, fill: 'rgba(248,81,73,0.7)' }} />

          {HALVINGS.filter((h) => h.ts >= startTs).map((h) => (
            <ReferenceLine
              key={h.label}
              x={h.ts}
              stroke={h.estimated ? 'rgba(255,255,255,0.25)' : 'rgba(255,200,50,0.5)'}
              strokeDasharray={h.estimated ? '6 4' : '4 3'}
              strokeWidth={1}
              label={{ value: h.label, position: 'insideTopRight', fontSize: 9, fill: h.estimated ? 'rgba(255,255,255,0.4)' : 'rgba(255,200,50,0.7)' }}
            />
          ))}

          {now >= startTs && (
            <ReferenceLine x={now} stroke="rgba(247,249,252,0.35)" strokeDasharray="2 4"
              label={{ value: 'Now', position: 'insideTopRight', fontSize: 10, fill: 'rgba(247,249,252,0.5)' }} />
          )}

          <XAxis
            dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
            ticks={YEAR_TICKS.filter((t) => t >= startTs)}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }} tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]} allowDataOverflow
            tickFormatter={(v) => fmtPct(v)}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }} tickLine={false} width={56}
          />

          <DeviationColorLine points={chartData} />
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: '#8B949E' }}>Days to halving</span>
          <span style={{ width: 90, height: 6, borderRadius: 3, display: 'inline-block', background: `linear-gradient(90deg, ${gradient})` }} />
          <span style={{ fontSize: 10, color: '#8B949E' }}>0 → 1,400+</span>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
