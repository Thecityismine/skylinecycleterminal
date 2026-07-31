"use client";

import { useEffect, useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea,
} from 'recharts';
import type { WeeklyPoint, ZoneEpisode } from '@/lib/indicators/generationZone';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';
import {
  RANGES, filterByRange, filterEpisodes, episodeBounds,
  xTicks, fmtXTick, spanYears, priceDomain, logTicks, fmtPrice,
} from '@/lib/charts/generationZoneScale';
import type { RangeKey } from '@/lib/charts/generationZoneScale';

type Props = {
  weekly:        WeeklyPoint[];
  episodes:      ZoneEpisode[];
  range:         RangeKey;
  onRangeChange: (r: RangeKey) => void;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

const usd = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WeeklyPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows: Array<[string, string, string]> = [
    ['Weekly close', usd(d.close), 'rgba(247,249,252,0.92)'],
    ['200 EMA', d.ema200 == null ? 'n/a' : usd(d.ema200), '#3B82F6'],
    ['230 SMMA', d.smma230 == null ? 'n/a' : usd(d.smma230), '#FF5C5C'],
  ];
  return (
    <div className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[210px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      {rows.map(([label, value, color]) => (
        <div key={label} className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>{label}</span>
          <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export function GenerationZoneChart({ weekly, episodes, range, onRangeChange, onZoomChange }: Props) {
  const { domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers } =
    useChartZoom<number>();

  useEffect(() => { onZoomChange?.(domain); }, [domain, onZoomChange]);

  const displayed = useMemo(() => filterByRange(weekly, range), [weekly, range]);

  const chartData = useMemo(() => {
    if (!domain) return displayed;
    const inside = displayed.filter((d) => d.ts >= domain.start && d.ts <= domain.end);
    return inside.length >= 2 ? inside : displayed;
  }, [displayed, domain]);

  const from = chartData.length ? chartData[0].ts : 0;
  const to = chartData.length ? chartData[chartData.length - 1].ts : 0;
  const span = spanYears(chartData);
  const [pMin, pMax] = useMemo(() => priceDomain(chartData), [chartData]);
  const visibleEpisodes = useMemo(
    () => filterEpisodes(episodes, from, to),
    [episodes, from, to],
  );

  const handleRange = (r: RangeKey) => { reset(); onRangeChange(r); };

  return (
    <div>
      {/* Range + zoom controls */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {RANGES.map((r) => {
          const active = r.key === range;
          return (
            <button
              key={r.key}
              onClick={() => handleRange(r.key)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: active ? 'var(--sct-border)' : 'transparent',
                borderColor:     'var(--sct-border)',
                color:           active ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {r.key}
            </button>
          );
        })}

        {isZoomed && (
          <button
            onClick={reset}
            className="px-3 py-1 rounded text-xs font-mono border transition-all"
            style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}
          >
            Reset Zoom
          </button>
        )}
        {!isZoomed && (
          <span className="hidden md:inline text-[10px] font-mono ml-1"
            style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
            drag to zoom
          </span>
        )}
      </div>

      <div
        style={{
          position:   'relative',
          width:      '100%',
          height:     460,
          cursor:     isSelecting ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
        onMouseLeave={cancel}
      >
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} {...chartHandlers}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

              {selectionArea && (
                <ReferenceArea
                  x1={selectionArea.x1}
                  x2={selectionArea.x2}
                  fill="rgba(255,255,255,0.06)"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={1}
                />
              )}

              {/* Every touch episode, shaded. Derived from the data, so a new one
                  appears on its own rather than waiting to be added by hand. */}
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
                ticks={xTicks(chartData)}
                tickFormatter={(ts: number) => fmtXTick(ts, span)}
                tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--sct-border)' }}
                tickLine={false}
              />
              <YAxis
                scale="log"
                domain={[pMin, pMax]}
                ticks={logTicks(pMin, pMax)}
                tickFormatter={fmtPrice}
                tick={{ fill: 'var(--sct-muted)', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: 'var(--sct-border)' }}
                tickLine={false}
                width={54}
                allowDataOverflow
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }}
              />

              <Line type="monotone" dataKey="smma230" stroke="#FF5C5C" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
              <Line type="monotone" dataKey="ema200" stroke="#3B82F6" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
              <Line type="monotone" dataKey="close" stroke="rgba(247,249,252,0.92)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        <ChartWatermark />
      </div>
    </div>
  );
}
