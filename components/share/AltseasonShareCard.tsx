"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import { REGIMES } from '@/lib/indicators/altseasonIndex';
import type { SignalDot } from '@/lib/indicators/altseasonIndex';

type ChartPoint = { time: string; ts: number; score: number; btcPrice: number | null };

export type AltseasonSharePayload = {
  score:             number;
  regimeLabel:       string;
  regimeColor:       string;
  btcDominance:      number;
  ethBtc:            number;
  altcoinsTracked:   number;
  altcoinsBeatingBtc: number;
  chartData:         ChartPoint[];
  signalDots:        SignalDot[];
  startTs:           number;
  rangeLabel:        string;
  generatedAt:       string;
  logoSrc?:          never;
};

const PAD      = 32;
const HEADER_H = 82;
const FOOTER_H = 30;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH  - PAD * 2;

export const ALTSEASON_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H, w: CHART_W, h: CHART_H,
};

const CARD_ZONES = [
  { y1: 0,  y2: 25,  fill: 'rgba(255,59,92,0.10)'  },
  { y1: 25, y2: 50,  fill: 'rgba(120,80,50,0.08)'   },
  { y1: 50, y2: 65,  fill: 'rgba(230,180,80,0.08)'  },
  { y1: 65, y2: 80,  fill: 'rgba(53,208,127,0.08)'  },
  { y1: 80, y2: 100, fill: 'rgba(69,243,255,0.10)'  },
];

const ALL_MONTH_TICKS = (() => {
  const ticks: number[] = [];
  const start = new Date(Date.now() - 365 * 86400_000);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  for (let m = 0; m < 14; m++) {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + m);
    ticks.push(d.getTime());
  }
  return ticks;
})();

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function AltseasonShareCard({ payload }: { payload: AltseasonSharePayload }) {
  const {
    score, regimeLabel, regimeColor, btcDominance, ethBtc,
    altcoinsTracked, altcoinsBeatingBtc, chartData, startTs, rangeLabel, generatedAt,
  } = payload;

  const dateStr  = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const visible  = chartData.filter((d) => d.ts >= startTs);
  const withPrice = visible.filter((d) => d.btcPrice != null);
  const btcMin  = withPrice.length ? Math.min(...withPrice.map((d) => d.btcPrice!)) * 0.9 : 1000;
  const btcMax  = withPrice.length ? Math.max(...withPrice.map((d) => d.btcPrice!)) * 1.1 : 200000;
  const monthTicks = ALL_MONTH_TICKS.filter((t) => t >= startTs);

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

      {/* ── Header ── */}
      <div style={{
        height:         HEADER_H,
        flex:           `0 0 ${HEADER_H}px`,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Skyline Cycle Terminal
          </div>
          <div style={{ fontSize: 12, color: '#8B949E', marginTop: 4 }}>
            Altcoin Season Index · {rangeLabel}
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 20, marginTop: 10, alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 22, fontWeight: 700, color: regimeColor }}>{score}</span>
              <span style={{ fontSize: 11, color: '#8B949E', marginLeft: 4 }}>/100</span>
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 600, color: regimeColor,
                backgroundColor: regimeColor + '20', padding: '2px 6px', borderRadius: 4,
              }}>
                {regimeLabel}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#8B949E' }}>
              <span style={{ color: '#E6EDF3', fontWeight: 600 }}>BTC.D</span>{' '}
              {btcDominance.toFixed(1)}%
            </div>
            <div style={{ fontSize: 10, color: '#8B949E' }}>
              <span style={{ color: '#E6EDF3', fontWeight: 600 }}>ETH/BTC</span>{' '}
              {ethBtc.toFixed(4)}
            </div>
            <div style={{ fontSize: 10, color: '#8B949E' }}>
              <span style={{ color: '#E6EDF3', fontWeight: 600 }}>Breadth</span>{' '}
              {altcoinsBeatingBtc}/{altcoinsTracked}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.12em' }}>LIVE DATA</span>
          </div>
          <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3 }}>{dateStr}</div>
          {/* Zone legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8, alignItems: 'flex-end' }}>
            {REGIMES.slice().reverse().map((r) => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: r.color, display: 'inline-block', opacity: 0.8 }} />
                <span style={{ fontSize: 8, color: '#8B949E' }}>{r.range[0]}–{r.range[1]}: {r.shortLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ width: CHART_W, height: CHART_H, flex: '0 0 auto' }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={visible}
          margin={{ top: 4, right: 60, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.5)" vertical={false} />

          {CARD_ZONES.map((z) => (
            <ReferenceArea
              key={`zone-${z.y1}`}
              yAxisId="score"
              y1={z.y1} y2={z.y2}
              fill={z.fill}
              stroke="none"
            />
          ))}

          {[25, 50, 65, 80].map((v) => (
            <ReferenceLine
              key={v}
              yAxisId="score"
              y={v}
              stroke="rgba(255,255,255,0.10)"
              strokeDasharray="4 4"
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={monthTicks}
            tickFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
            tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="score"
            domain={[0, 100]}
            tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={26}
            ticks={[0, 25, 50, 65, 80, 100]}
          />
          <YAxis
            yAxisId="btc"
            orientation="right"
            scale="log"
            domain={[btcMin, btcMax]}
            allowDataOverflow
            tickFormatter={fmtPrice}
            tick={{ fill: 'rgba(247,249,252,0.25)', fontSize: 9, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Line
            yAxisId="btc"
            type="monotone"
            dataKey="btcPrice"
            stroke="rgba(247,249,252,0.20)"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="score"
            stroke="#45F3FF"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </div>

      {/* ── Footer ── */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'flex-end',
      }}>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
