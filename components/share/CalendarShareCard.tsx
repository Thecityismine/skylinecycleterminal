"use client";

import { CYCLE_PHASE_LABEL, CYCLE_PHASE_COLOR, MONTH_NAMES, heatmapCellColor } from '@/lib/indicators/seasonality';
import type { CyclePhase } from '@/lib/indicators/seasonality';
import type { HeatmapRow } from '@/app/api/calendar/route';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type CalendarSharePayload = {
  asset:            string;
  monthName:        string;
  medianReturn:     number;
  medianVolatility: number;
  positiveYears:    number;
  sampleSize:       number;
  currentPhase:     CyclePhase;
  heatmap:          HeatmapRow[]; // recent years only
  generatedAt:      string;
  logoSrc?:         never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const GRID_H   = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const GRID_W   = SHARE_CARD_WIDTH - PAD * 2;

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function CalendarShareCard({ payload }: { payload: CalendarSharePayload }) {
  const {
    asset, monthName, medianReturn, medianVolatility, positiveYears, sampleSize,
    currentPhase, heatmap, generatedAt,
  } = payload;

  const phaseColor = CYCLE_PHASE_COLOR[currentPhase];
  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const stats = [
    { label: 'Median Return',   value: fmtPct(medianReturn),         sub: monthName,                                color: medianReturn >= 0 ? '#35D07F' : '#F85149' },
    { label: 'Median Volatility', value: `${medianVolatility.toFixed(1)}%`, sub: 'High-to-low range',                  color: '#E6B450' },
    { label: 'Positive Years',  value: `${positiveYears}/${sampleSize}`, sub: 'Historical sample',                    color: '#F7F9FC' },
    { label: 'Cycle Phase',     value: CYCLE_PHASE_LABEL[currentPhase], sub: '4-year framework',                      color: phaseColor },
  ];

  const rowH = Math.floor((GRID_H - 20) / (heatmap.length + 1));
  const colW = (GRID_W - 60) / 12;

  return (
    <div style={{
      width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, backgroundColor: '#0D1117',
      position: 'relative', overflow: 'hidden', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      display: 'flex', flexDirection: 'column', padding: PAD, boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ height: HEADER_H, flex: `0 0 ${HEADER_H}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>Skyline Crypto Calendar — {asset}</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>{monthName} seasonality · {CYCLE_PHASE_LABEL[currentPhase]}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 0' }}>{dateStr}</p>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        height: STATS_H, flex: `0 0 ${STATS_H}px`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginTop: GAP, marginBottom: GAP,
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8,
            padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Mini heatmap */}
      <div style={{ flex: '0 0 auto', width: GRID_W, height: GRID_H }}>
        <div style={{ display: 'grid', gridTemplateColumns: `50px repeat(12, ${colW}px)`, gap: 3, marginBottom: 4 }}>
          <div />
          {MONTH_NAMES.map((m) => (
            <div key={m} style={{ fontSize: 9, color: '#6B7280', textAlign: 'center' }}>{m}</div>
          ))}
        </div>
        {heatmap.map((row) => (
          <div key={row.year} style={{ display: 'grid', gridTemplateColumns: `50px repeat(12, ${colW}px)`, gap: 3, marginBottom: 3, height: rowH }}>
            <div style={{ fontSize: 10, color: '#8B949E', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: CYCLE_PHASE_COLOR[row.cyclePhase], display: 'inline-block' }} />
              {row.year}
            </div>
            {row.monthly.map((v, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: v === null ? '#161B22' : heatmapCellColor(v),
                  borderRadius: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: v === null ? '#484F58' : (Math.abs(v) >= 5 ? '#fff' : '#E6EDF3'),
                }}
              >
                {v === null ? '' : `${v >= 0 ? '+' : ''}${v.toFixed(0)}`}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {(['bottom', 'recovery', 'rally', 'top'] as CyclePhase[]).map((phase) => (
            <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: CYCLE_PHASE_COLOR[phase], display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#8B949E' }}>{CYCLE_PHASE_LABEL[phase]}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
