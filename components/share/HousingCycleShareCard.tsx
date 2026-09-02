"use client";

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import { formatCardDate } from '@/lib/share/cardDate';
import { SEGMENT_COLOR, type CyclePoint, type CycleSegment } from '@/lib/indicators/housingCycle';

export type HousingCycleSharePayload = {
  chartData:    CyclePoint[];
  segments:     CycleSegment[];
  real:         boolean;
  drawdown:     number;
  realChange36: number | null;
  phaseName:    string;
  phaseColor:   string;
  dealStage:    string;
  dealColor:    string;
  dealFired:    number;
  dealTotal:    number;
  generatedAt:  string;
};

const PAD       = 32;
const HEADER_H  = 72;
const STATS_H   = 52;
const GAP       = 10;
const STATS_GAP = 22;
const FOOTER_H  = 24;
const CHART_H   = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W   = SHARE_CARD_WIDTH  - PAD * 2;

export const HOUSING_CYCLE_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

export function HousingCycleShareCard({ payload }: { payload: HousingCycleSharePayload }) {
  const {
    chartData, segments, real, drawdown, realChange36,
    phaseName, phaseColor, dealStage, dealColor, dealFired, dealTotal,
  } = payload;

  const dateStr = formatCardDate(payload);
  const key = real ? 'real' : 'nominal';

  const ddColor = drawdown > -3 ? '#35D07F' : drawdown > -15 ? '#E6B450' : '#FF5C5C';

  // The longest completed round trip in the record. This is the number that
  // makes the card worth sharing — it is invisible on a nominal chart, and it
  // reframes housing from "always goes up" to "goes up on a timescale that can
  // outlast your holding period".
  const completed = segments.filter(
    (s) => s.kind === 'recovery' && s.label.startsWith('Recovery'),
  );
  const longestWait = completed.reduce<{ years: number; from: string } | null>((acc, rec) => {
    const peak = segments.find((s) => s.kind === 'contraction' && s.endTs === rec.startTs);
    if (!peak) return acc;
    const years = (rec.endTs - peak.startTs) / (365.25 * 864e5);
    return !acc || years > acc.years ? { years, from: peak.start.slice(0, 4) } : acc;
  }, null);

  const stats = [
    {
      label: 'FROM REAL PEAK',
      value: `${drawdown.toFixed(1)}%`,
      sub:   'Case-Shiller, inflation-adjusted',
      color: ddColor,
    },
    {
      label: '36-MONTH REAL',
      value: realChange36 == null ? '—' : `${realChange36 > 0 ? '+' : ''}${realChange36.toFixed(1)}%`,
      sub:   'Purchasing power, three years',
      color: realChange36 != null && realChange36 < 1 ? '#E6B450' : '#35D07F',
    },
    {
      label: 'CYCLE PHASE',
      value: phaseName,
      sub:   'Derived from conditions',
      color: phaseColor,
    },
    {
      label: 'DEAL WINDOW',
      value: `${dealFired} / ${dealTotal}`,
      sub:   dealStage,
      color: dealColor,
    },
  ];

  const maxReal = chartData.length ? Math.max(...chartData.map((d) => d.real)) : 0;

  return (
    <div style={{
      width:           SHARE_CARD_WIDTH,
      height:          SHARE_CARD_HEIGHT,
      backgroundColor: '#0D1117',
      position:        'relative',
      overflow:        'hidden',
      color:           '#E6EDF3',
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
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        overflow:       'hidden',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#E6EDF3', textTransform: 'uppercase' }}>
            Skyline Cycle Terminal
          </div>
          <div style={{ fontSize: 12, color: '#8B949E', marginTop: 4, letterSpacing: '0.03em' }}>
            The Long Housing Cycle · Case-Shiller {real ? 'deflated by CPI' : 'as published'} · S&amp;P / BLS
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
            {[
              { color: SEGMENT_COLOR.contraction, label: 'Contraction' },
              { color: SEGMENT_COLOR.recovery,    label: 'Below prior real peak' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', backgroundColor: `${color}30`, border: `1px solid ${color}66` }} />
                <span style={{ fontSize: 9, color, letterSpacing: '0.05em' }}>{label}</span>
              </div>
            ))}
            {longestWait && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: '#E6B450', letterSpacing: '0.05em' }}>
                  {longestWait.from} peak took {longestWait.years.toFixed(1)}y to break even
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.12em' }}>LIVE DATA</span>
          </div>
          <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3 }}>{dateStr}</div>
          <div style={{
            marginTop:       6,
            padding:         '2px 8px',
            borderRadius:    4,
            display:         'inline-block',
            backgroundColor: `${phaseColor}20`,
            fontSize:        10,
            color:           phaseColor,
          }}>
            {phaseName}
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
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 9, color: '#6E7681', letterSpacing: '0.1em' }}>{s.label}</div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: s.color, marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: 9, color: '#6E7681', marginTop: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height: CHART_H, flex: `0 0 ${CHART_H}px`, marginTop: STATS_GAP }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={chartData}
          margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {segments
            .filter((s) => s.kind !== 'expansion')
            .map((s) => (
              <ReferenceArea
                key={`${s.kind}-${s.startTs}`}
                x1={s.startTs}
                x2={s.endTs}
                fill={SEGMENT_COLOR[s.kind]}
                fillOpacity={s.kind === 'contraction' ? 0.14 : 0.07}
                stroke="none"
              />
            ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts: number) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6E7681', fontSize: 9 }}
            stroke="rgba(38,50,65,0.6)"
            minTickGap={30}
          />
          <YAxis
            dataKey={key}
            domain={['auto', 'auto']}
            tick={{ fill: '#6E7681', fontSize: 9 }}
            stroke="rgba(38,50,65,0.6)"
            width={38}
            tickFormatter={(v: number) => v.toFixed(0)}
          />

          {real && maxReal > 0 && (
            <ReferenceLine y={maxReal} stroke="#F97316" strokeDasharray="4 4" strokeOpacity={0.7} />
          )}

          <Line
            type="monotone"
            dataKey={key}
            stroke="#22D3EE"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{
        height:     FOOTER_H,
        flex:       `0 0 ${FOOTER_H}px`,
        display:    'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        fontSize:   10,
        color:      '#6E7681',
      }}>
        <span>Shaded periods detected from the series, not supplied</span>
        <span>skylinecycleterminal.com</span>
      </div>
    </div>
  );
}
