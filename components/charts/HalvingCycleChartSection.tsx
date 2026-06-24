"use client";

import { useState, useMemo, useCallback } from 'react';
import { ImageDown } from 'lucide-react';
import {
  HalvingCycleComparisonChart,
  type ChartRow,
  type CycleMeta,
} from '@/components/charts/HalvingCycleComparisonChart';
import { CycleComparisonShareModal } from '@/components/share/CycleComparisonShareModal';
import type { CycleComparisonSharePayload } from '@/components/share/CycleComparisonShareCard';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';
import type { AlignedPoint, MedianPoint, NormMode } from '@/lib/indicators/halvingCycleAlign';

const PHASES = [
  { x1: 0,    x2: 180,  label: 'Post-Halving Consolidation' },
  { x1: 180,  x2: 500,  label: 'Expansion Window'           },
  { x1: 500,  x2: 750,  label: 'Distribution Watch'         },
  { x1: 750,  x2: 1050, label: 'Drawdown / Reset'           },
  { x1: 1050, x2: 1400, label: 'Pre-Halving Accumulation'   },
];

type CycleData = {
  id: string;
  label: string;
  halvingDate: string;
  halvingPrice: number;
  blockReward: number;
  color: string;
  strokeWidth: number;
  isActive: boolean;
  peakReturn: number | null;
  daysToPeak: number | null;
  maxDrawdown: number | null;
  points: AlignedPoint[];
};

type CurrentStats = {
  daysSince: number;
  price: number;
  returnPct: number;
  indexed: number;
  halvingPrice: number;
  vsMedianIndexed: number | null;
};

type Props = {
  cycles: CycleData[];
  medianPath: MedianPoint[];
  current: CurrentStats;
};

export function HalvingCycleChartSection({ cycles, medianPath, current }: Props) {
  const [mode,           setMode]           = useState<NormMode>('indexed');
  const [logScale,       setLogScale]       = useState(true);
  const [showPhases,     setShowPhases]     = useState(false);
  const [showMedian,     setShowMedian]     = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [zoomDomain,     setZoomDomain]     = useState<ZoomDomain<number> | null>(null);
  const [shareHovered,   setShareHovered]   = useState(false);

  const handleZoomChange = useCallback((d: ZoomDomain<number> | null) => {
    setZoomDomain(d);
  }, []);

  // Build merged ChartRow array keyed by day
  const mergedData = useMemo((): ChartRow[] => {
    // Collect all unique days
    const daySet = new Set<number>();
    for (const c of cycles) {
      for (const pt of c.points) daySet.add(pt.day);
    }
    // Also add median days
    for (const m of medianPath) daySet.add(m.day);

    const days = Array.from(daySet).sort((a, b) => a - b);

    // Build lookup maps per cycle
    const cycleMaps = cycles.map(c => {
      const m = new Map<number, AlignedPoint>();
      for (const pt of c.points) m.set(pt.day, pt);
      return m;
    });

    // Build median map
    const medianMap = new Map<number, MedianPoint>();
    for (const m of medianPath) medianMap.set(m.day, m);

    return days.map(day => {
      const row: ChartRow = { day };
      cycles.forEach((c, i) => {
        const pt = cycleMaps[i].get(day);
        if (pt !== undefined) {
          row[`c${c.id}`] = mode === 'indexed'    ? pt.indexed
                          : mode === 'returnPct'  ? pt.returnPct
                          : mode === 'rewardAdj'  ? pt.rewardAdj
                          : pt.raw;
        }
      });
      const med = medianMap.get(day);
      if (med) {
        row.p25 = med.p25;
        row.p50 = med.p50;
        row.p75 = med.p75;
      }
      return row;
    });
  }, [cycles, medianPath, mode]);

  const cycleMeta: CycleMeta[] = cycles.map(c => ({
    id:          c.id,
    label:       c.label,
    color:       c.color,
    strokeWidth: c.strokeWidth,
    isActive:    c.isActive,
  }));

  // Share payload
  const sharePayload = useMemo((): CycleComparisonSharePayload => {
    const filteredData = zoomDomain
      ? mergedData.filter(r => r.day >= zoomDomain.start && r.day <= zoomDomain.end)
      : mergedData;

    return {
      chartData:  filteredData,
      cycles:     cycleMeta,
      medianPath,
      current,
      showMedian,
      generatedAt: new Date().toISOString(),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedData, cycleMeta, medianPath, current, showMedian, zoomDomain]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Bitcoin Cycle Comparison
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Halving-aligned · Days since halving on X-axis
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono shrink-0 flex-wrap">
          {/* Cycle color legend */}
          {cycles.map(c => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span
                style={{
                  width:           16,
                  height:          c.isActive ? 3 : 2,
                  backgroundColor: c.color,
                  borderRadius:    1,
                  display:         'inline-block',
                }}
              />
              <span style={{ color: c.isActive ? c.color : 'var(--sct-muted)' }}>
                {c.label}
              </span>
            </span>
          ))}

          {/* Share button */}
          <button
            onClick={() => setShowShareModal(true)}
            onMouseEnter={() => setShareHovered(true)}
            onMouseLeave={() => setShareHovered(false)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: 'transparent',
              borderColor:     'var(--sct-border)',
              color:           shareHovered ? '#F7931A' : 'var(--sct-muted)',
            }}
          >
            <ImageDown size={13} />
            Share Card
          </button>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Mode buttons */}
        {(['indexed', 'returnPct', 'rewardAdj', 'raw'] as NormMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: mode === m ? 'var(--sct-border)' : 'transparent',
              borderColor:     'var(--sct-border)',
              color:           mode === m ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            {m === 'indexed' ? 'Indexed' : m === 'returnPct' ? 'Return %' : m === 'rewardAdj' ? 'Reward Adj' : 'Raw Price'}
          </button>
        ))}

        <span className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--sct-border)' }} />

        {/* Toggle buttons */}
        {(
          [
            ['logScale',    'Log Scale',  logScale,    () => setLogScale(v => !v)  ],
            ['showPhases',  'Phases',     showPhases,  () => setShowPhases(v => !v)],
            ['showMedian',  'Median',     showMedian,  () => setShowMedian(v => !v)],
          ] as [string, string, boolean, () => void][]
        ).map(([key, lbl, active, toggle]) => (
          <button
            key={key}
            onClick={toggle}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: active ? 'var(--sct-border)' : 'transparent',
              borderColor:     'var(--sct-border)',
              color:           active ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Chart */}
      <HalvingCycleComparisonChart
        chartData={mergedData}
        medianPath={medianPath}
        cycles={cycleMeta}
        mode={mode}
        logScale={logScale}
        showPhases={showPhases}
        showMedian={showMedian}
        currentDaysSince={current.daysSince}
        onZoomChange={handleZoomChange}
      />

      {/* Phase legend */}
      {showPhases && (
        <div className="flex flex-wrap gap-3 mt-3">
          {PHASES.map(ph => (
            <span key={ph.label} className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
              ◼ {ph.label}
            </span>
          ))}
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <CycleComparisonShareModal
          payload={sharePayload}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
