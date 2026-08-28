"use client";

import { useState, useMemo } from 'react';
import { RealizedVolChart } from '@/components/charts/RealizedVolChart';
import type { RealizedVolPoint } from '@/lib/indicators/realizedVolatility';

type Timeframe = 'All' | '4Y' | '2Y';
const TIMEFRAMES: Timeframe[] = ['All', '4Y', '2Y'];
const TF_DAYS: Record<Timeframe, number> = { All: Infinity, '4Y': 1460, '2Y': 730 };

type Props = {
  data:         RealizedVolPoint[];
  longRunMean:  number | null;
  compressedAt: number | null;
};

export function RealizedVolChartSection({ data, longRunMean, compressedAt }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('All');
  const [showPrice, setShowPrice] = useState(true);
  const [show90,    setShow90]    = useState(true);

  const displayed = useMemo(() => {
    const days = TF_DAYS[timeframe];
    if (days === Infinity) return data;
    // Anchored to the last data point rather than to wall-clock time. Date.now()
    // during render is impure (react-hooks/purity), and anchoring to the series
    // is the more honest read anyway: "2Y" should mean two years of data, not two
    // years back from whenever the component happened to re-render.
    const anchor = data.at(-1)?.ts;
    if (anchor == null) return data;
    const cutoff = anchor - days * 86_400_000;
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
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Annualized Realized Volatility — 30d and 90d
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Standard deviation of daily log returns · shaded band = bottom 15% of history · dashed verticals = halvings
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
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
          {toggleBtn(show90,    '90d Vol',   '#A78BFA', () => setShow90(v => !v))}
          {toggleBtn(showPrice, 'BTC Price', '#F7931A', () => setShowPrice(v => !v))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {[
          { color: '#38BDF8', label: '30-day realized volatility' },
          { color: '#A78BFA', label: '90-day realized volatility' },
          { color: '#35D07F', label: 'Compression zone (bottom 15%)' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: color + '90' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="relative h-[440px]">
        <RealizedVolChart
          data={displayed}
          showPrice={showPrice}
          show90={show90}
          longRunMean={longRunMean}
          compressedAt={compressedAt}
        />
      </div>
    </div>
  );
}
