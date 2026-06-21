"use client";

import { useMemo, useState } from 'react';
import { PowerLawChart }    from '@/components/charts/PowerLawChart';
import { ChartWatermark }  from '@/components/charts/ChartWatermark';
import type { PowerLawPoint } from '@/lib/indicators/powerLaw';

type Range = '2Y' | '4Y' | 'All';
const RANGES: Range[] = ['All', '4Y', '2Y'];
const RANGE_DAYS: Record<Range, number> = { '2Y': 730, '4Y': 1460, All: Infinity };

type Props = { data: PowerLawPoint[] };

export function PowerLawPageClient({ data }: Props) {
  const [range, setRange] = useState<Range>('All');

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => d.ts >= cutoff);
  }, [data, range]);

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTC Power Law — Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Dashed region = 2-year projection · log10(price) = 5.82 × log10(days) − 16.73
          </p>
        </div>

        {/* Timeframe filter */}
        <div className="flex gap-1.5">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: range === r ? 'var(--sct-border)' : 'transparent',
                borderColor: 'var(--sct-border)',
                color: range === r ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {[
          { color: 'rgba(247,249,252,0.9)', label: 'BTC Price' },
          { color: '#F472B6',              label: 'Ceiling (×4.27)' },
          { color: '#38BDF8',              label: 'Fair Value' },
          { color: '#818CF8',              label: 'Floor (×0.42)' },
        ].map(({ color, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs font-mono"
            style={{ color: 'var(--sct-muted)' }}
          >
            <span style={{ display: 'inline-block', width: 24, height: 1.5, backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="relative h-[480px]">
        <PowerLawChart data={filtered} />
        <ChartWatermark />
      </div>
    </div>
  );
}
