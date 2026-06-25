"use client";

import {
  ComposedChart, Area, XAxis, YAxis,
  CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { DrawdownPoint } from '@/lib/indicators/drawdownFromATH';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type DrawdownSharePayload = {
  data:            DrawdownPoint[];
  timeframe:       string;
  showHalvings:    boolean;
  showCycles:      boolean;
  currentDD:       number;
  currentATH:      number;
  currentPrice:    number;
  athDate:         string;
  daysSinceATH:    number;
  recovery:        number;
  currentCycleMax: number;
  regimeLabel:     string;
  regimeColor:     string;
  generatedAt:     string;
  logoSrc?:        never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 22;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const DRAWDOWN_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const HALVINGS = [
  { ts: new Date('2012-11-28T00:00:00Z').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09T00:00:00Z').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11T00:00:00Z').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19T00:00:00Z').getTime(), label: 'H4' },
];

const BEAR_BOTTOMS = [
  { ts: new Date('2011-11-18T00:00:00Z').getTime(), label: '2011  -93.8%' },
  { ts: new Date('2015-01-14T00:00:00Z').getTime(), label: '2015  -86.9%' },
  { ts: new Date('2018-12-15T00:00:00Z').getTime(), label: '2018  -84.2%' },
  { ts: new Date('2022-11-21T00:00:00Z').getTime(), label: '2022  -77.5%' },
];

const YEAR_TICKS = Array.from({ length: 17 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime(),
);

function fmtPct(v: number): string { return v === 0 ? '0%' : `${v.toFixed(0)}%`; }
function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function DrawdownShareCard({ payload }: { payload: DrawdownSharePayload }) {
  const {
    data, timeframe, showHalvings, showCycles,
    currentDD, currentATH, currentPrice, athDate, daysSinceATH, recovery,
    regimeLabel, regimeColor, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const recoveryColor = recovery > 100 ? '#FF5C5C' : recovery > 50 ? '#F97316' : '#E6B450';
  const daysColor = daysSinceATH > 500 ? '#FF5C5C' : daysSinceATH > 200 ? '#E6B450' : '#35D07F';

  const stats = [
    {
      label: 'Current Drawdown',
      value: `${currentDD.toFixed(1)}%`,
      sub:   regimeLabel,
      color: regimeColor,
    },
    {
      label: 'All-Time High',
      value: fmtUSD(currentATH),
      sub:   athDate,
      color: '#F7F9FC',
    },
    {
      label: 'BTC Price',
      value: fmtUSD(currentPrice),
      sub:   recovery < 0.1 ? 'At all-time high' : `+${recovery.toFixed(1)}% to ATH`,
      color: '#F7931A',
    },
    {
      label: 'Days Since ATH',
      value: daysSinceATH > 0 ? daysSinceATH.toLocaleString() : 'ATH Today',
      sub:   daysSinceATH > 0 ? `Since ${athDate}` : 'New ATH set today',
      color: daysColor,
    },
  ];

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
            Bitcoin Drawdown From ATH
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            Distance from all-time high · Daily close
            {timeframe !== 'All' ? ` · ${timeframe}` : ''}
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
              {timeframe}
            </span>
            {showHalvings && (
              <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#F7931A' }}>
                Halvings
              </span>
            )}
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
        {stats.map((s) => (
          <div key={s.label} style={{
            backgroundColor: '#161B22',
            border:          '1px solid #21262D',
            borderRadius:    8,
            padding:         '4px 12px',
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
          data={data}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 6, right: 12, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {/* Zone bands */}
          <ReferenceArea y1={0}    y2={-15}  fill="rgba(53,208,127,0.05)"  stroke="none" ifOverflow="hidden" />
          <ReferenceArea y1={-15}  y2={-30}  fill="rgba(230,180,80,0.07)"  stroke="none" ifOverflow="hidden" />
          <ReferenceArea y1={-30}  y2={-50}  fill="rgba(249,115,22,0.08)"  stroke="none" ifOverflow="hidden" />
          <ReferenceArea y1={-50}  y2={-70}  fill="rgba(255,92,92,0.10)"   stroke="none" ifOverflow="hidden" />
          <ReferenceArea y1={-70}  y2={-100} fill="rgba(185,28,28,0.16)"   stroke="none" ifOverflow="hidden" />

          {/* Threshold lines */}
          <ReferenceLine y={0}   stroke="rgba(247,249,252,0.15)" strokeWidth={1} />
          <ReferenceLine y={-15} stroke="rgba(53,208,127,0.25)"  strokeWidth={0.5} strokeDasharray="4 3" />
          <ReferenceLine y={-30} stroke="rgba(230,180,80,0.30)"  strokeWidth={0.5} strokeDasharray="4 3" />
          <ReferenceLine y={-50} stroke="rgba(249,115,22,0.30)"  strokeWidth={0.5} strokeDasharray="4 3" />
          <ReferenceLine y={-70} stroke="rgba(255,92,92,0.30)"   strokeWidth={0.5} strokeDasharray="4 3" />

          {/* Halvings */}
          {showHalvings && HALVINGS.map(h => (
            <ReferenceLine
              key={h.label}
              x={h.ts}
              stroke="rgba(247,147,26,0.40)"
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{ value: h.label, position: 'insideTopRight', fill: 'rgba(247,147,26,0.55)', fontSize: 9 }}
            />
          ))}

          {/* Bear bottoms */}
          {showCycles && BEAR_BOTTOMS.map(b => (
            <ReferenceLine
              key={b.label}
              x={b.ts}
              stroke="rgba(255,92,92,0.30)"
              strokeWidth={1}
              strokeDasharray="3 3"
              label={{ value: b.label, position: 'insideTopLeft', fill: 'rgba(255,92,92,0.60)', fontSize: 9 }}
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={YEAR_TICKS}
            tickFormatter={ts => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            domain={[-100, 5]}
            ticks={[0, -20, -40, -60, -80, -100]}
            tickFormatter={fmtPct}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={44}
            allowDataOverflow
          />

          <Area
            type="monotone"
            dataKey="drawdown"
            fill="rgba(247,147,26,0.09)"
            stroke="#F7931A"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            baseValue={0}
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
            {[
              { color: 'rgba(53,208,127,0.5)',  label: '>-15%'       },
              { color: 'rgba(230,180,80,0.5)',  label: '-15 to -30%' },
              { color: 'rgba(249,115,22,0.5)',  label: '-30 to -50%' },
              { color: 'rgba(255,92,92,0.5)',   label: '-50 to -70%' },
              { color: 'rgba(185,28,28,0.6)',   label: '<-70%'       },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color, display: 'inline-block' }} />
                <span style={{ fontSize: 9, color: '#6B7280' }}>{l.label}</span>
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
