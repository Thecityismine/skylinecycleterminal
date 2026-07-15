"use client";

import { useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceArea, ReferenceLine, ReferenceDot, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartWatermark } from './ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';
import type { ScenarioBands } from '@/lib/cycles/sevenYearCycle';

export type ChartPoint = { ts: number; time: string; price: number };
export type HalvingMarker = { ts: number; label: string; estimated: boolean };
export type StressWindowMarker = { startTs: number; endTs: number; label: string; projected: boolean };
export type InstitutionalEraMarker = { startTs: number; endTs: number | null; label: string; color: string };
export type CycleMarker = { ts: number; price: number; kind: 'low' | 'high'; label: string };

type Props = {
  points:             ChartPoint[];
  halvings:           HalvingMarker[];
  stressWindows:      StressWindowMarker[];
  institutionalEras:  InstitutionalEraMarker[];
  cycleMarkers:       CycleMarker[];
  scenarioBands:      ScenarioBands | null;
  showHalvings:       boolean;
  showStressWindows:  boolean;
  showInstitutionalEras: boolean;
  showScenarioBands:  boolean;
  onZoomChange?:      (domain: ZoomDomain<number> | null) => void;
};

const LOG_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];
const CHART_END_TS = new Date('2030-06-01T00:00:00Z').getTime();

const YEAR_TICKS = Array.from({ length: 21 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime(),
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtUSD(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function CycleMarkerDot({ cx, cy, kind }: { cx?: number; cy?: number; kind: 'low' | 'high' }) {
  if (cx == null || cy == null) return null;
  const color = kind === 'low' ? '#38BDF8' : '#FF5C8A';
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={color} fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="#0B0F17" strokeWidth={1.5} />
    </g>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[160px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-1 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-sm font-mono font-bold" style={{ color: '#F5F7FA' }}>{fmtUSD(d.price)}</p>
    </div>
  );
}

export function BTCSevenYearCycleChart({
  points, halvings, stressWindows, institutionalEras, cycleMarkers, scenarioBands,
  showHalvings, showStressWindows, showInstitutionalEras, showScenarioBands, onZoomChange,
}: Props) {
  const zoom = useChartZoom<number>();
  useEffect(() => { onZoomChange?.(zoom.domain); }, [zoom.domain, onZoomChange]);

  const prices = points.map((p) => p.price).filter((v) => v > 0);
  const pMin = prices.length ? Math.max(1, Math.min(...prices) * 0.5) : 1;
  let pMax = prices.length ? Math.max(...prices) * 2 : 200_000;
  if (showScenarioBands && scenarioBands) {
    pMax = Math.max(pMax, scenarioBands.bullish.high * 1.2);
  }
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const xStart = points[0]?.ts ?? new Date('2010-01-01').getTime();
  const xEnd = Math.max(points.at(-1)?.ts ?? CHART_END_TS, CHART_END_TS);

  const scenarioStartTs = new Date('2028-04-01T00:00:00Z').getTime();
  const scenarioEndTs   = new Date('2029-12-31T00:00:00Z').getTime();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="flex items-center justify-end gap-3 mb-1 flex-wrap">
        {zoom.isZoomed && (
          <button
            onClick={zoom.reset}
            className="px-3 py-1 rounded text-xs font-mono border transition-all"
            style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}
          >
            Reset Zoom
          </button>
        )}
        {!zoom.isZoomed && (
          <span className="hidden md:inline text-[10px] font-mono" style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
            drag to zoom
          </span>
        )}
      </div>

      <div
        style={{ position: 'relative', width: '100%', height: 480, cursor: zoom.isSelecting ? 'crosshair' : 'default', userSelect: 'none' }}
        onMouseLeave={zoom.cancel}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} {...zoom.chartHandlers}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

            {/* Institutional era shading (faint, full height) */}
            {showInstitutionalEras && institutionalEras.map((era) => (
              <ReferenceArea
                key={era.label}
                x1={era.startTs}
                x2={era.endTs ?? xEnd}
                fill={era.color}
                fillOpacity={0.05}
                stroke="none"
              />
            ))}

            {/* Seven-year stress bands */}
            {showStressWindows && stressWindows.map((w) => (
              <ReferenceArea
                key={w.label}
                x1={w.startTs}
                x2={w.endTs}
                fill="#F85149"
                fillOpacity={w.projected ? 0.05 : 0.08}
                stroke={w.projected ? '#F85149' : 'none'}
                strokeOpacity={w.projected ? 0.4 : 0}
                strokeDasharray={w.projected ? '4 4' : undefined}
              />
            ))}

            {/* Scenario bands over the 2028-2029 window */}
            {showScenarioBands && scenarioBands && (
              <>
                <ReferenceArea x1={scenarioStartTs} x2={scenarioEndTs} y1={scenarioBands.bullish.low} y2={scenarioBands.bullish.high} fill="#35D07F" fillOpacity={0.12} stroke="none" />
                <ReferenceArea x1={scenarioStartTs} x2={scenarioEndTs} y1={scenarioBands.hybrid.low} y2={scenarioBands.hybrid.high} fill="#E6B450" fillOpacity={0.12} stroke="none" />
                <ReferenceArea x1={scenarioStartTs} x2={scenarioEndTs} y1={scenarioBands.stress.low} y2={scenarioBands.stress.high} fill="#F85149" fillOpacity={0.12} stroke="none" />
              </>
            )}

            {/* Halving markers */}
            {showHalvings && halvings.map((h) => (
              <ReferenceLine
                key={h.label}
                x={h.ts}
                stroke="#F7931A"
                strokeOpacity={0.55}
                strokeDasharray="4 4"
                label={{ value: h.label, position: 'insideTopRight', fill: '#F7931A', fontSize: 10, fillOpacity: 0.8 }}
              />
            ))}

            {zoom.selectionArea && (
              <ReferenceArea
                x1={zoom.selectionArea.x1}
                x2={zoom.selectionArea.x2}
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
              />
            )}

            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={zoom.domain ? [zoom.domain.start, zoom.domain.end] : [xStart, xEnd]}
              ticks={YEAR_TICKS}
              tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
              tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
            />
            <YAxis
              scale="log"
              domain={[pMin, pMax]}
              ticks={logTicks}
              tickFormatter={fmtPrice}
              tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              width={56}
              allowDataOverflow
            />

            <Tooltip content={<CustomTooltip />} cursor={zoom.isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }} />

            <Line
              type="monotone"
              dataKey="price"
              stroke="#F5F7FA"
              strokeWidth={2.25}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />

            {/* Cycle low/high markers — ReferenceDot rather than a separate
                Scatter series, so this sparse point set never interferes
                with the shared Tooltip's hover-index tracking on the main
                price line. */}
            {cycleMarkers.map((m) => (
              <ReferenceDot
                key={`${m.kind}-${m.ts}`}
                x={m.ts}
                y={m.price}
                r={0}
                shape={(dotProps: { cx?: number; cy?: number }) => <CycleMarkerDot cx={dotProps.cx} cy={dotProps.cy} kind={m.kind} />}
                ifOverflow="extendDomain"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <ChartWatermark />
      </div>
    </div>
  );
}
