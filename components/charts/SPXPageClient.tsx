"use client";

import { useState, useMemo } from 'react';
import { SPXRecessionChart }  from '@/components/charts/SPXRecessionChart';
import type { SPXPoint }      from '@/lib/indicators/recessionRisk';

type Timeframe = '10Y' | '20Y' | 'All';
const TIMEFRAMES: Timeframe[] = ['All', '20Y', '10Y'];
const TF_DAYS: Record<Timeframe, number> = { '10Y': 3650, '20Y': 7300, All: Infinity };

type Props = { data: SPXPoint[]; ath: number };

export function SPXPageClient({ data, ath }: Props) {
  const [timeframe, setTimeframe]       = useState<Timeframe>('All');
  const [logScale,  setLogScale]        = useState(true);
  const [show50w,   setShow50w]         = useState(true);
  const [show200w,  setShow200w]        = useState(true);
  const [showRecs,  setShowRecs]        = useState(true);

  const displayed = useMemo(() => {
    const days = TF_DAYS[timeframe];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => d.ts >= cutoff);
  }, [data, timeframe]);

  const toggleBtn = (active: boolean, label: string, color: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
      style={{
        backgroundColor: active ? color + '20' : 'transparent',
        borderColor:     active ? color         : 'var(--sct-border)',
        color:           active ? color         : 'var(--sct-muted)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            S&P 500 with NBER Recession Periods
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Daily closing price · 50W & 200W moving averages · shaded = official NBER recessions
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: timeframe === tf ? 'var(--sct-border)' : 'transparent',
                borderColor: 'var(--sct-border)',
                color: timeframe === tf ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {tf}
            </button>
          ))}
          <div className="w-px mx-0.5" style={{ backgroundColor: 'var(--sct-border)' }} />
          {toggleBtn(logScale,  'LOG',        '#A855F7', () => setLogScale(v => !v))}
          {toggleBtn(showRecs,  'Recessions', '#FF5C5C', () => setShowRecs(v => !v))}
          {toggleBtn(show50w,   '50W',        '#3B82F6', () => setShow50w(v => !v))}
          {toggleBtn(show200w,  '200W',       '#A855F7', () => setShow200w(v => !v))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {[
          { color: 'rgba(247,249,252,0.9)', label: 'S&P 500' },
          { color: '#3B82F6',              label: '50W MA' },
          { color: '#A855F7',              label: '200W MA' },
          { color: 'rgba(220,60,60,0.35)', label: 'NBER Recession', fill: true },
        ].map(({ color, label, fill }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
            {fill
              ? <span style={{ display: 'inline-block', width: 14, height: 10, backgroundColor: color, border: `1px solid rgba(220,60,60,0.4)` }} />
              : <span style={{ display: 'inline-block', width: 24, height: 1.5, backgroundColor: color }} />
            }
            {label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[460px]">
        <SPXRecessionChart
          data={displayed}
          show50w={show50w}
          show200w={show200w}
          showRecessions={showRecs}
          logScale={logScale}
          ath={ath}
        />
      </div>
    </div>
  );
}
