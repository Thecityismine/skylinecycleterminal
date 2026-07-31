"use client";

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea,
} from 'recharts';
import type { WeeklyPoint, ZoneEpisode } from '@/lib/indicators/generationZone';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import {
  filterEpisodes, episodeBounds, xTicks, fmtXTick, spanYears,
  priceDomain, logTicks, fmtPrice,
} from '@/lib/charts/generationZoneScale';

export type GenerationZoneSharePayload = {
  points:          WeeklyPoint[];
  episodes:        ZoneEpisode[];
  rangeLabel:      string;
  close:           number;
  ema200:          number | null;
  smma230:         number | null;
  distanceToEma:   number | null;
  distanceToSmma:  number | null;
  weekLabel:       string;
  /**
   * True only when the visible window ends at the most recent weekly close.
   * Zoom into 2018 and the zone status and conditions count no longer describe
   * the chart, so the card drops both rather than stamping today's reading on
   * a historical window.
   */
  isLive:          boolean;
  inZone:          boolean;
  depth:           'outside' | 'at-ema' | 'at-smma';
  conditionsMet:   number;
  conditionsTotal: number;
  generatedAt:     string;
};

const PAD       = 32;
const HEADER_H  = 72;
const STATS_H   = 52;
const GAP       = 10;
const STATS_GAP = 22;
const FOOTER_H  = 24;
const CHART_H   = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W   = SHARE_CARD_WIDTH - PAD * 2;

export const GENERATION_ZONE_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const DEPTH_SUB: Record<GenerationZoneSharePayload['depth'], string> = {
  outside:   'Above both averages',
  'at-ema':  'At the 200 EMA',
  'at-smma': 'Reached the 230 SMMA',
};

function fmtP(v: number | null): string {
  return v == null ? 'n/a' : fmtPrice(v);
}

function signed(v: number | null): string {
  return v == null ? 'no reading' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}% from price`;
}

export function GenerationZoneShareCard({ payload }: { payload: GenerationZoneSharePayload }) {
  const {
    points, episodes, rangeLabel, close, ema200, smma230,
    distanceToEma, distanceToSmma, weekLabel, isLive, inZone, depth,
    conditionsMet, conditionsTotal, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const from = points.length ? points[0].ts : 0;
  const to = points.length ? points[points.length - 1].ts : 0;
  const span = spanYears(points);
  const [pMin, pMax] = priceDomain(points);
  const visibleEpisodes = filterEpisodes(episodes, from, to);

  const zoneColor = isLive && inZone ? '#35D07F' : '#8B949E';

  const stats = [
    { label: 'Weekly close', value: fmtPrice(close), sub: `Week ending ${weekLabel}`, color: '#F7F9FC' },
    { label: '200 EMA',      value: fmtP(ema200),    sub: signed(distanceToEma),      color: '#3B82F6' },
    { label: '230 SMMA',     value: fmtP(smma230),   sub: signed(distanceToSmma),     color: '#FF5C5C' },
    isLive
      ? { label: 'Zone status', value: inZone ? 'Active' : 'Outside', sub: DEPTH_SUB[depth], color: zoneColor }
      : { label: 'Zone status', value: '—', sub: 'Historical window', color: '#8B949E' },
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
            Generation Buying Zone
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            BTC weekly closes against the 200 EMA and 230 SMMA
            {' · '}{rangeLabel === 'All' ? 'Full history' : rangeLabel}
            {' · Log scale'}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
            </div>
          )}
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
              {rangeLabel}
            </span>
            {isLive && (
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                backgroundColor: zoneColor + '20', color: zoneColor,
              }}>
                {conditionsMet} of {conditionsTotal} conditions
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
        marginBottom:        STATS_GAP,
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
          data={points}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 12, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {visibleEpisodes.map((ep) => {
            const [x1, x2] = episodeBounds(ep, from, to);
            return (
              <ReferenceArea
                key={ep.start}
                x1={x1}
                x2={x2}
                fill={ep.reachedSmma ? 'rgba(53,208,127,0.22)' : 'rgba(53,208,127,0.12)'}
                stroke="none"
              />
            );
          })}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={xTicks(points)}
            tickFormatter={(ts: number) => fmtXTick(ts, span)}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks(pMin, pMax)}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={60}
            allowDataOverflow
          />

          <Line type="monotone" dataKey="smma230" stroke="#FF5C5C" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="ema200" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="close" stroke="rgba(247,249,252,0.9)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
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
            { color: 'rgba(247,249,252,0.9)', label: 'Weekly close' },
            { color: '#3B82F6',               label: '200 EMA'      },
            { color: '#FF5C5C',               label: '230 SMMA'     },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 16, height: 2, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: '#8B949E' }}>{l.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 16, height: 8, backgroundColor: 'rgba(53,208,127,0.22)', display: 'inline-block', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Touch episode</span>
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
