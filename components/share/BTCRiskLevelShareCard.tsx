"use client";

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { riskColor, riskZone, ZONE_META } from '@/lib/indicators/riskScore';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type BTCRiskLevelSharePayload = {
  points:            { ts: number; time: string; price: number; score: number | null }[];
  modelLabel:        string;
  currentPrice:      number | null;
  currentScore:      number | null;
  historicalPct:     number | null;
  generatedAt:       string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const RISK_LEVEL_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

const BAND_COUNT = 5;

function bandIndex(score: number): number {
  return Math.min(BAND_COUNT - 1, Math.floor(score * BAND_COUNT));
}

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export function BTCRiskLevelShareCard({ payload }: { payload: BTCRiskLevelSharePayload }) {
  const { points, modelLabel, currentPrice, currentScore, historicalPct, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const zone = currentScore != null ? ZONE_META[riskZone(currentScore)] : null;
  const color = currentScore != null ? riskColor(currentScore) : '#8B949E';

  const chartData = points.map((p, i) => {
    const row: Record<string, number | string | null> = { ts: p.ts, price: p.price };
    for (let b = 0; b < BAND_COUNT; b++) row[`price_b${b}`] = null;
    if (p.score != null) {
      const band = bandIndex(p.score);
      row[`price_b${band}`] = p.price;
      const prev = points[i - 1];
      if (prev?.score != null && bandIndex(prev.score) !== band) row[`price_b${bandIndex(prev.score)}`] = p.price;
    }
    return row;
  });

  const prices = points.map((p) => p.price).filter((v) => v > 0);
  const pMin = prices.length ? Math.max(0.01, Math.min(...prices) * 0.6) : 0.01;
  const pMax = prices.length ? Math.max(...prices) * 1.5 : 200_000;
  const bandColors = Array.from({ length: BAND_COUNT }, (_, b) => riskColor((b + 0.5) / BAND_COUNT));

  const stats = [
    { label: 'BTC Price',           value: fmtUSD(currentPrice),                                sub: 'Latest close',      color: '#F7931A' },
    { label: 'Risk Score',          value: currentScore != null ? currentScore.toFixed(3) : '—', sub: modelLabel,          color },
    { label: 'Zone',                value: zone?.label ?? '—',                                   sub: 'Historical read',   color: zone?.color ?? '#8B949E' },
    { label: 'Historical Percentile', value: historicalPct != null ? `${historicalPct.toFixed(0)}%` : '—', sub: 'vs full BTC history', color: '#5B84FF' },
  ];

  return (
    <div style={{
      width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, backgroundColor: '#0D1117',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      display: 'flex', flexDirection: 'column', padding: PAD, boxSizing: 'border-box',
    }}>
      <div style={{ height: HEADER_H, flex: `0 0 ${HEADER_H}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>BTC Historical Risk Level</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>{modelLabel} · Full history</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
        </div>
      </div>

      <div style={{ height: STATS_H, flex: `0 0 ${STATS_H}px`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: GAP, marginBottom: GAP }}>
        {stats.map((s) => (
          <div key={s.label} style={{ backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart data={chartData} width={CHART_W} height={CHART_H} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={56}
            allowDataOverflow
          />
          {Array.from({ length: BAND_COUNT }, (_, b) => (
            <Line
              key={b}
              type="monotone"
              dataKey={`price_b${b}`}
              stroke={bandColors[b]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
        </ComposedChart>
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {bandColors.map((c, i) => (
            <span key={i} style={{ width: 14, height: 4, backgroundColor: c, display: 'inline-block', borderRadius: 2 }} />
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
