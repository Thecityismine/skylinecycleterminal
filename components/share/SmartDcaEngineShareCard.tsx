"use client";

import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import { riskColor, riskZone } from '@/lib/indicators/riskScore';

export type SmartDcaEngineSharePayload = {
  price:            number | null;
  score:            number | null;
  zoneLabel:        string;
  bestDayLabel:     string;
  multiplierLabel:  string;
  actionLabel:      string;
  generatedAt:      string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CENTER_H = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CARD_W   = SHARE_CARD_WIDTH - PAD * 2;

// No chart on this card — the "chart rect" scopes the watermark to the
// central recommendation area instead.
export const SMART_DCA_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CARD_W, h: CENTER_H,
};

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export function SmartDcaEngineShareCard({ payload }: { payload: SmartDcaEngineSharePayload }) {
  const { price, score, zoneLabel, bestDayLabel, multiplierLabel, actionLabel, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const color = score != null ? riskColor(score) : '#8B949E';
  const zone  = score != null ? riskZone(score) : null;

  const stats = [
    { label: 'BTC Price',  value: fmtUSD(price),                          sub: 'Latest close',    color: '#F7931A' },
    { label: 'Risk Score', value: score != null ? score.toFixed(3) : '—', sub: zoneLabel,          color },
    { label: 'Best DCA Day', value: bestDayLabel,                         sub: 'Historical weekday', color: '#5B84FF' },
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
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>Smart DCA Engine</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>Skyline Cycle Terminal</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
        </div>
      </div>

      <div style={{ height: STATS_H, flex: `0 0 ${STATS_H}px`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: GAP, marginBottom: GAP }}>
        {stats.map((s) => (
          <div key={s.label} style={{ backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Central recommendation, in place of a chart */}
      <div style={{
        height: CENTER_H, flex: `0 0 ${CENTER_H}px`,
        backgroundColor: '#161B22', border: `1px solid ${color}`, borderRadius: 12,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <p style={{ fontSize: 11, color: '#8B949E', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
          Suggested Action
        </p>
        <p style={{ fontSize: 42, fontWeight: 800, color, margin: 0 }}>{multiplierLabel}</p>
        <p style={{ fontSize: 14, color: '#8B949E', margin: 0 }}>{actionLabel}</p>
        {zone && (
          <p style={{ fontSize: 11, color, margin: '4px 0 0' }}>{zoneLabel} zone</p>
        )}
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: GAP }}>
        <span style={{ fontSize: 10, color: '#6B7280' }}>Rules-based · educational only</span>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
