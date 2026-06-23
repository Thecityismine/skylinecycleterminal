"use client";

import { useState, useMemo } from 'react';
import { CycleMasterChart }       from '@/components/charts/CycleMasterChart';
import { CycleMasterShareModal }  from '@/components/share/CycleMasterShareModal';
import type { CycleMasterPoint }  from '@/lib/indicators/cycleMaster';
import type { Range }             from '@/components/charts/CycleMasterChart';
import type { CycleMasterSharePayload } from '@/components/share/CycleMasterShareCard';

const DAYS: Record<Range, number> = { '4Y': 1460, '8Y': 2920, 'All': Infinity };

type Props = {
  data:        CycleMasterPoint[];
  price:       number | null;
  realized:    number | null;
  transferred: number | null;
  mvrv:        number | null;
  score:       number | null;
  scoreLabel:  string | null;
  scoreColor:  string | null;
};

export function CycleMasterChartSection({
  data, price, realized, transferred, mvrv, score, scoreLabel, scoreColor,
}: Props) {
  const [range,    setRange]    = useState<Range>('All');
  const [logScale, setLogScale] = useState(true);

  const displayed = useMemo(() => {
    const days = DAYS[range];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => d.ts >= cutoff);
  }, [data, range]);

  const sharePayload: CycleMasterSharePayload = {
    data: displayed,
    range,
    logScale,
    price,
    realized,
    transferred,
    mvrv,
    score,
    scoreLabel,
    scoreColor,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTC Price Model — Terminal · Transferred · Realized · Balance
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Log scale · Dashed verticals = halvings · All prices in USD
          </p>
        </div>
        <CycleMasterShareModal payload={sharePayload} />
      </div>
      <CycleMasterChart
        data={data}
        logScale
        onRangeChange={setRange}
        onLogChange={setLogScale}
      />
    </div>
  );
}
