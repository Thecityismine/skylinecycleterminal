"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { RegimeZone } from '@/lib/indicators/regimeHelpers';
import { REGIME_FILL } from '@/lib/indicators/regimeHelpers';

export type NormalizedPoint = {
  time:   string;
  ts:     number;
  btc:    number | null;
  gold:   number | null;
  sp500:  number | null;
  nasdaq: number | null;
  dxy:    number | null;
};

export type AssetKey = 'btc' | 'gold' | 'sp500' | 'nasdaq' | 'dxy';

export const ASSET_CONFIG: Record<AssetKey, { label: string; color: string; width: number }> = {
  btc:    { label: 'Bitcoin',   color: '#F7931A', width: 2.5 },
  gold:   { label: 'Gold',      color: '#D6B05E', width: 1.5 },
  sp500:  { label: 'S&P 500',   color: '#53A7FF', width: 1.5 },
  nasdaq: { label: 'Nasdaq',    color: '#9B8CFF', width: 1.5 },
  dxy:    { label: 'USD Index', color: '#B0BAC7', width: 1.5 },
};

const ALL_ASSETS: AssetKey[] = ['btc', 'gold', 'sp500', 'nasdaq', 'dxy'];

const YEAR_TICKS = Array.from({ length: 16 }, (_, i) =>
  new Date(`${2012 + i}-01-01`).getTime(),
);

const LOG_TICKS_NORM  = [50, 100, 150, 200, 300, 500, 1000, 2000, 5000];
const LIN_TICKS_NORM  = [50, 100, 150, 200, 300, 400, 500];

function fmtRet(v: number): string {
  const ret = v - 100;
  return `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`;
}

function CustomTooltip({ active, payload, activeAssets }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as NormalizedPoint;
  if (!d) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[200px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        {ALL_ASSETS.filter((k) => activeAssets.has(k)).map((key) => {
          const val = d[key];
          if (val == null) return null;
          const cfg = ASSET_CONFIG[key];
          return (
            <div key={key} className="flex justify-between gap-6">
              <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--sct-muted)' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
              </span>
              <span className="text-xs font-mono font-medium" style={{ color: cfg.color }}>
                {val.toFixed(1)} <span style={{ color: 'var(--sct-muted)', fontWeight: 400 }}>({fmtRet(val)})</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] mt-2 pt-1.5 border-t" style={{ color: 'var(--sct-muted)', borderColor: 'var(--sct-border)' }}>
        Rebased to 100 at period start
      </p>
    </div>
  );
}

type Props = {
  data:         NormalizedPoint[];
  zones:        RegimeZone[];
  activeAssets: Set<AssetKey>;
  logScale:     boolean;
  showZones:    boolean;
};

export function CrossAssetChart({ data, zones, activeAssets, logScale, showZones }: Props) {
  if (!data.length) return null;

  const yDomain = logScale
    ? [50, 'auto' as const]
    : ['auto' as const, 'auto' as const];

  const yTicks = logScale ? LOG_TICKS_NORM : undefined;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

        {/* Bull / Bear regime shading */}
        {showZones && zones.map((z) => (
          <ReferenceArea
            key={`${z.start}-${z.regime}`}
            x1={z.startTs}
            x2={z.endTs}
            fill={REGIME_FILL[z.regime]}
            stroke="none"
          />
        ))}

        {/* Baseline at 100 */}
        <ReferenceLine
          y={100}
          stroke="rgba(255,255,255,0.12)"
          strokeDasharray="4 4"
        />

        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={YEAR_TICKS}
          tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />
        <YAxis
          scale={logScale ? 'log' : 'linear'}
          domain={yDomain}
          ticks={yTicks}
          allowDataOverflow
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={52}
        />

        <Tooltip content={<CustomTooltip activeAssets={activeAssets} />} />

        {/* Non-BTC assets first (underneath BTC) */}
        {(['gold', 'sp500', 'nasdaq', 'dxy'] as AssetKey[]).map((key) => {
          if (!activeAssets.has(key)) return null;
          const cfg = ASSET_CONFIG[key];
          return (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={cfg.color}
              strokeWidth={cfg.width}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          );
        })}

        {/* BTC on top — widest, brightest */}
        {activeAssets.has('btc') && (
          <Line
            type="monotone"
            dataKey="btc"
            stroke={ASSET_CONFIG.btc.color}
            strokeWidth={ASSET_CONFIG.btc.width}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
