"use client";

import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type CycleTimerSharePayload = {
  daysSinceLow:           number;
  lowDateFmt:             string;
  lowPrice:                number;
  phaseLabel:              string;
  phaseColor:              string;
  timingDeviation:         number;
  medianLowToHigh:         number;
  medianHighToLow:         number;
  completedCycles:         number;
  peakWindowStartDate:     string;
  peakWindowEndDate:       string;
  bottomWindowStartDate:   string;
  bottomWindowEndDate:     string;
  timingModelLabel:        string;
  generatedAt:             string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CENTER_H = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CARD_W   = SHARE_CARD_WIDTH - PAD * 2;

export const CYCLE_TIMER_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CARD_W, h: CENTER_H,
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function signedDays(n: number): string {
  if (n === 0) return '0 days';
  return `${n > 0 ? '+' : ''}${fmt(n)} days vs median`;
}

export function CycleTimerShareCard({ payload }: { payload: CycleTimerSharePayload }) {
  const {
    daysSinceLow, lowDateFmt, lowPrice, phaseLabel, phaseColor, timingDeviation,
    medianLowToHigh, medianHighToLow, completedCycles,
    peakWindowStartDate, peakWindowEndDate, bottomWindowStartDate, bottomWindowEndDate,
    timingModelLabel, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const stats = [
    { label: 'Days Since Cycle Low', value: `${fmt(daysSinceLow)}d`,          sub: `Low: ${lowDateFmt} · $${fmt(lowPrice)}`, color: '#F7931A' },
    { label: 'Current Phase',        value: phaseLabel,                       sub: signedDays(timingDeviation),              color: phaseColor },
    { label: 'Timing Model',         value: timingModelLabel,                 sub: 'Low→High → High→Low',                    color: '#5B84FF' },
    { label: 'Historical Median',    value: `${fmt(medianLowToHigh)}d / ${fmt(medianHighToLow)}d`, sub: `${completedCycles} completed cycles`, color: '#E6B450' },
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
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>Bitcoin Cycle Duration Timer</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>Projected Peak &amp; Bottom Windows</p>
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

      <div style={{ height: CENTER_H, flex: `0 0 ${CENTER_H}px`, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div style={{
          backgroundColor: 'rgba(234,184,77,0.06)', border: '1px solid rgba(234,184,77,0.35)', borderRadius: 12,
          padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#E6B450', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            Model Peak Window
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#F7F9FC', margin: 0 }}>Day 1,000–1,125</p>
          <p style={{ fontSize: 13, color: '#8B949E', margin: 0 }}>{peakWindowStartDate} → {peakWindowEndDate}</p>
        </div>
        <div style={{
          backgroundColor: 'rgba(91,132,255,0.06)', border: '1px solid rgba(91,132,255,0.35)', borderRadius: 12,
          padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#5B84FF', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            Model Bottom Window
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#F7F9FC', margin: 0 }}>Day 1,350–1,500</p>
          <p style={{ fontSize: 13, color: '#8B949E', margin: 0 }}>{bottomWindowStartDate} → {bottomWindowEndDate}</p>
        </div>
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: GAP }}>
        <span style={{ fontSize: 10, color: '#6B7280' }}>Observed pattern, not a forecast</span>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
