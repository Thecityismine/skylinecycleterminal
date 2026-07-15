"use client";

import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type SevenYearCycleSharePayload = {
  price:          number;
  fourYearPhase:  string;
  sevenYearPhase: string;
  modelAgreement: string;
  scenarioBands: {
    bullish: { low: number; high: number };
    hybrid:  { low: number; high: number };
    stress:  { low: number; high: number };
  };
  generatedAt:    string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CENTER_H = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CARD_W   = SHARE_CARD_WIDTH - PAD * 2;

export const SEVEN_YEAR_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CARD_W, h: CENTER_H,
};

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const SCENARIOS = [
  { key: 'bullish', label: 'Scenario A — Halving Dominates', color: '#35D07F', desc: '2028 halving liquidity expands, BTC rallies into 2029.' },
  { key: 'hybrid',  label: 'Scenario C — Hybrid Cycle',      color: '#E6B450', desc: 'Rally into the halving, stress arrives later in 2029.' },
  { key: 'stress',  label: 'Scenario B — Stress Dominates',  color: '#F85149', desc: 'Macro stress overwhelms the halving tailwind.' },
] as const;

export function SevenYearCycleShareCard({ payload }: { payload: SevenYearCycleSharePayload }) {
  const { price, fourYearPhase, sevenYearPhase, modelAgreement, scenarioBands, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const stats = [
    { label: 'BTC Price',       value: fmtUSD(price),  sub: 'Latest close',        color: '#F7931A' },
    { label: '4-Year Model',    value: fourYearPhase,  sub: 'Halving cycle phase', color: '#F7931A' },
    { label: '7-Year Model',    value: sevenYearPhase, sub: 'Stress cycle phase',  color: '#F85149' },
    { label: 'Model Agreement', value: modelAgreement, sub: 'Do models align?',    color: '#5B84FF' },
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
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>Bitcoin 7-Year Stress Cycle</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>2028–2029 Scenario Map</p>
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
            <p style={{ fontSize: 13, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ height: CENTER_H, flex: `0 0 ${CENTER_H}px`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {SCENARIOS.map((s) => {
          const band = scenarioBands[s.key];
          return (
            <div
              key={s.key}
              style={{
                backgroundColor: `${s.color}0F`, border: `1px solid ${s.color}4D`, borderRadius: 12,
                padding: '16px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8,
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1.4 }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#F7F9FC', margin: 0 }}>
                {fmtUSD(band.low)} – {fmtUSD(band.high)}
              </p>
              <p style={{ fontSize: 10, color: '#8B949E', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          );
        })}
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: GAP }}>
        <span style={{ fontSize: 10, color: '#6B7280' }}>Illustrative ranges, not a forecast — hypothesis-testing content</span>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
