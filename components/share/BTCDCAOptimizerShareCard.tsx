"use client";

import { ComposedChart, Bar, Cell, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import type { BucketStat, Metric, ForwardWindow } from '@/lib/indicators/dcaOptimizer';
import { metricValue } from '@/lib/indicators/dcaOptimizer';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type BTCDCAOptimizerSharePayload = {
  buckets:      BucketStat[];
  metric:       Metric;
  metricLabel:  string;
  winWindow:    ForwardWindow;
  groupByLabel: string;
  rangeLabel:   string;
  maLabel:      string;
  best:         BucketStat | null;
  generatedAt:  string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const DCA_OPTIMIZER_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

const GREEN = '#35D07F';
const RED   = '#F85149';

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function isDiscountMetric(metric: Metric): boolean {
  return metric === 'avgDiscount' || metric === 'medianDiscount';
}

export function BTCDCAOptimizerShareCard({ payload }: { payload: BTCDCAOptimizerSharePayload }) {
  const { buckets, metric, metricLabel, winWindow, groupByLabel, rangeLabel, maLabel, best, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const data = buckets.map((b) => ({ ...b, value: metricValue(b, metric, winWindow) }));
  const values = data.map((d) => d.value).filter((v): v is number => v != null);
  const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  const favorable = (v: number) => isDiscountMetric(metric) ? v <= avg : v >= avg;

  const stats = [
    { label: `Best ${groupByLabel}`, value: best?.label ?? '—',            sub: 'Highest-ranked bucket',      color: '#F7931A' },
    { label: 'Avg Discount',         value: fmtPct(best?.avgDiscount ?? null), sub: `vs ${maLabel}`,          color: '#5B84FF' },
    { label: '30D Return',           value: fmtPct(best?.avgFwd30 ?? null),    sub: 'Avg forward return',     color: GREEN     },
    { label: '90D Return',           value: fmtPct(best?.avgFwd90 ?? null),    sub: 'Avg forward return',     color: GREEN     },
  ];

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
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>BTC DCA Optimizer</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            {metricLabel} by {groupByLabel} · {rangeLabel}
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
              {maLabel}
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
        <ComposedChart data={data} width={CHART_W} height={CHART_H} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={56}
          />
          <ReferenceLine y={0} stroke="#21262D" strokeWidth={1} />
          <Bar dataKey="value" maxBarSize={56} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={d.value == null ? '#4B5563' : favorable(d.value) ? GREEN : RED}
                fillOpacity={best && d.key === best.key ? 1 : 0.65}
                stroke={best && d.key === best.key ? '#F7931A' : 'none'}
                strokeWidth={best && d.key === best.key ? 2 : 0}
              />
            ))}
          </Bar>
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, backgroundColor: GREEN, display: 'inline-block', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Favorable</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, backgroundColor: RED, display: 'inline-block', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Unfavorable</span>
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
