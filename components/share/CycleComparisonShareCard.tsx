"use client";

import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import type { MedianPoint } from '@/lib/indicators/halvingCycleAlign';

export type ChartRow = Record<string, number>;

export type CycleMeta = {
  id: string;
  label: string;
  color: string;
  strokeWidth: number;
  isActive: boolean;
};

export type CycleComparisonSharePayload = {
  chartData: ChartRow[];
  cycles: CycleMeta[];
  medianPath: MedianPoint[];
  current: {
    daysSince: number;
    price: number;
    returnPct: number;
    indexed: number;
    vsMedianIndexed: number | null;
  };
  showMedian: boolean;
  generatedAt: string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 60;
const GAP      = 8;
const STATS_GAP = 20;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const CYCLE_COMPARISON_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

function fmtY(v: number): string {
  return `${v.toFixed(0)}`;
}

export function CycleComparisonShareCard({ payload }: { payload: CycleComparisonSharePayload }) {
  const { chartData, cycles, medianPath, current, showMedian, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const vsColor = current.vsMedianIndexed === null
    ? '#8B949E'
    : current.vsMedianIndexed >= 0 ? '#35D07F' : '#F85149';

  const stats = [
    {
      label: 'Days Since Halving',
      value: current.daysSince.toLocaleString(),
      sub:   '2024 Halving cycle',
      color: '#F7931A',
    },
    {
      label: 'BTC Return',
      value: `${current.returnPct >= 0 ? '+' : ''}${current.returnPct.toFixed(1)}%`,
      sub:   'Since halving day',
      color: current.returnPct >= 0 ? '#35D07F' : '#F85149',
    },
    {
      label: 'vs Median',
      value: current.vsMedianIndexed !== null
        ? `${current.vsMedianIndexed >= 0 ? '+' : ''}${current.vsMedianIndexed.toFixed(1)}%`
        : '—',
      sub:   'vs historical cycles',
      color: vsColor,
    },
    {
      label: 'BTC Price',
      value: `$${(current.price / 1000).toFixed(1)}K`,
      sub:   'Current price',
      color: '#F5F7FA',
    },
  ];

  // Build median map for the chart
  const medianMap = new Map<number, MedianPoint>();
  for (const m of medianPath) medianMap.set(m.day, m);

  // Add p50 to chart data for median line
  const enrichedData = chartData.map(row => {
    const med = medianMap.get(row.day);
    return med ? { ...row, p50: med.p50 } : row;
  });

  // Historical cycles first, active cycle last
  const historicalCycles = cycles.filter(c => !c.isActive);
  const activeCycles     = cycles.filter(c => c.isActive);

  return (
    <div style={{
      width:           SHARE_CARD_WIDTH,
      height:          SHARE_CARD_HEIGHT,
      backgroundColor: '#0D1117',
      position:        'relative',
      overflow:        'hidden',
      fontFamily:      'ui-monospace, SFMono-Regular, Menlo, monospace',
      display:         'flex',
      flexDirection:   'column',
      padding:         PAD,
      boxSizing:       'border-box',
    }}>

      {/* Header */}
      <div style={{
        height:         HEADER_H,
        flex:           `0 0 ${HEADER_H}px`,
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>
            Bitcoin Cycle Comparison
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            Halving-aligned · Indexed to halving day = 100 · Log scale
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
              Day {current.daysSince}
            </span>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#F7931A20', fontSize: 10, color: '#F7931A', fontWeight: 600 }}>
              2024 Cycle Active
            </span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        height:              STATS_H,
        flex:                `0 0 ${STATS_H}px`,
        display:             'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:                 12,
        marginTop:           GAP,
        marginBottom:        GAP,
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            backgroundColor: '#161B22',
            border:          '1px solid #21262D',
            borderRadius:    8,
            padding:         '6px 12px',
            display:         'flex',
            flexDirection:   'column',
            justifyContent:  'center',
          }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart
          data={enrichedData}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 12, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          <XAxis
            dataKey="day"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => `Day ${v}`}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={80}
          />

          <YAxis
            scale="log"
            domain={[50, 'auto']}
            allowDataOverflow
            tickFormatter={fmtY}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={64}
          />

          {/* Historical cycle lines */}
          {historicalCycles.map(c => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={`c${c.id}`}
              name={c.label}
              stroke={c.color}
              strokeWidth={c.strokeWidth}
              strokeOpacity={0.75}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}

          {/* Median p50 dashed */}
          {showMedian && (
            <Line
              type="monotone"
              dataKey="p50"
              name="Historical Median"
              stroke="rgba(139,148,158,0.7)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Active cycle lines (on top) */}
          {activeCycles.map(c => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={`c${c.id}`}
              name={c.label}
              stroke={c.color}
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}

          {/* TODAY reference line */}
          <ReferenceLine
            x={current.daysSince}
            stroke="#F7931A"
            strokeDasharray="4 4"
            label={{
              value: `TODAY · Day ${current.daysSince}`,
              position: 'insideTopRight',
              fontSize: 9,
              fill: '#F7931A',
            }}
          />
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {cycles.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width:           16,
                height:          c.isActive ? 3 : 2,
                backgroundColor: c.color,
                display:         'inline-block',
                borderRadius:    1,
              }} />
              <span style={{ fontSize: 10, color: '#8B949E' }}>{c.label}</span>
            </div>
          ))}
          {showMedian && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width:  16, height: 1,
                backgroundColor: 'rgba(139,148,158,0.7)',
                display: 'inline-block', borderRadius: 1,
              }} />
              <span style={{ fontSize: 10, color: '#8B949E' }}>Historical Median</span>
            </div>
          )}
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
