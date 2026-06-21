"use client";

import { useState, useMemo } from 'react';
import { FearGreedChart }     from '@/components/charts/FearGreedChart';
import type { FGCombinedPoint } from '@/components/charts/FearGreedChart';

type Timeframe = 'All' | '2Y' | '1Y' | '90D';
const TIMEFRAMES: Timeframe[] = ['All', '2Y', '1Y', '90D'];
const TF_DAYS: Record<Timeframe, number> = { All: Infinity, '2Y': 730, '1Y': 365, '90D': 90 };

type Props = { data: FGCombinedPoint[] };

export function FearGreedPageClient({ data }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('All');

  const displayed = useMemo(() => {
    const days = TF_DAYS[timeframe];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => d.ts >= cutoff);
  }, [data, timeframe]);

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTC Price & Fear / Greed Index
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Daily · log scale · hover for synchronized crosshair
          </p>
        </div>
        <div className="flex gap-1.5">
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
        </div>
      </div>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {[
          { color: '#16a34a', label: 'Extreme Greed (75–100)' },
          { color: '#65a30d', label: 'Greed (50–74)' },
          { color: '#d97706', label: 'Fear (25–49)' },
          { color: '#dc2626', label: 'Extreme Fear (0–24)' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: color + '80' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Dual-panel chart */}
      <FearGreedChart data={displayed} />
    </div>
  );
}
