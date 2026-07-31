"use client";

import { useMemo, useState } from 'react';
import { GenerationZoneChart } from '@/components/charts/GenerationZoneChart';
import { GenerationZoneShareModal } from '@/components/share/GenerationZoneShareModal';
import { filterByRange } from '@/lib/charts/generationZoneScale';
import type { RangeKey } from '@/lib/charts/generationZoneScale';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';
import type { GenerationZoneResult } from '@/lib/indicators/generationZone';

const LEGEND = [
  { c: 'rgba(247,249,252,0.92)', l: 'Weekly close' },
  { c: '#3B82F6', l: '200 EMA' },
  { c: '#FF5C5C', l: '230 SMMA' },
  { c: 'rgba(53,208,127,0.5)', l: 'Touch episode' },
];

const monthYear = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const pctFrom = (close: number, level: number | null) =>
  level == null || level <= 0 ? null : ((close - level) / level) * 100;

export function GenerationZoneChartSection({ data }: { data: GenerationZoneResult }) {
  const [range, setRange] = useState<RangeKey>('All');
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);

  const displayed = useMemo(() => filterByRange(data.weekly, range), [data.weekly, range]);

  // Mirrors the chart's own zoom filter, including its fallback, so the card is
  // a picture of what is on screen rather than of the full series.
  const shareData = useMemo(() => {
    if (!zoomDomain) return displayed;
    const inside = displayed.filter((d) => d.ts >= zoomDomain.start && d.ts <= zoomDomain.end);
    return inside.length >= 2 ? inside : displayed;
  }, [displayed, zoomDomain]);

  const payload = useMemo(() => {
    const last = shareData[shareData.length - 1];
    const latest = data.weekly[data.weekly.length - 1];
    const isLive = !!last && !!latest && last.ts === latest.ts;

    const rangeLabel = zoomDomain && shareData.length
      ? `${monthYear(shareData[0].ts)} – ${monthYear(last.ts)}`
      : range;

    return {
      points:          shareData,
      episodes:        data.episodes,
      rangeLabel,
      close:           last?.close ?? data.current.close,
      ema200:          last?.ema200 ?? null,
      smma230:         last?.smma230 ?? null,
      distanceToEma:   last ? pctFrom(last.close, last.ema200) : null,
      distanceToSmma:  last ? pctFrom(last.close, last.smma230) : null,
      weekLabel:       last?.time ?? data.current.time,
      isLive,
      inZone:          data.current.inZone,
      depth:           data.current.depth,
      conditionsMet:   data.conditions.filter((c) => c.met).length,
      conditionsTotal: data.conditions.length,
      generatedAt:     new Date().toISOString(),
    };
  }, [shareData, data, range, zoomDomain]);

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
          BTC/USD weekly, log scale
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          {LEGEND.map((x) => (
            <div key={x.l} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: x.c }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>{x.l}</span>
            </div>
          ))}
          <GenerationZoneShareModal payload={payload} />
        </div>
      </div>

      <GenerationZoneChart
        weekly={data.weekly}
        episodes={data.episodes}
        range={range}
        onRangeChange={setRange}
        onZoomChange={setZoomDomain}
      />

      <p className="text-[10px] mt-2" style={{ color: 'var(--sct-muted)' }}>
        Shaded bands mark every week price closed at or below one of the averages, within a 2% tolerance.
        Darker bands reached the deeper 230 SMMA. The 200 EMA needs 200 weekly closes and the 230 SMMA needs 230,
        so neither exists before mid-2014 and this chart says nothing about 2011 to 2013.
        {range !== 'All' && ' Shorter windows show the averages but not the history they were built from.'}
      </p>
    </div>
  );
}
