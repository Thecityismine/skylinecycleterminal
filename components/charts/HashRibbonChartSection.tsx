"use client";

import { useState, useMemo } from 'react';
import { HashRibbonChart } from '@/components/charts/HashRibbonChart';
import type { HRPoint, Range } from '@/components/charts/HashRibbonChart';
import { HashRibbonShareModal } from '@/components/share/HashRibbonShareModal';
import type { HashRibbonSharePayload } from '@/components/share/HashRibbonShareCard';

const DAYS: Record<Range, number> = { '2Y': 730, '4Y': 1460, 'All': Infinity };

type Props = {
  data:         HRPoint[];
  fetchError:   boolean;
  statusLabel:  string;
  statusColor:  string;
  currentPrice: number | null;
  currentMA30:  number | null;
  currentMA60:  number | null;
  currentRatio: number | null;
  dataSource:   string;
};

export function HashRibbonChartSection({
  data, fetchError, statusLabel, statusColor,
  currentPrice, currentMA30, currentMA60, currentRatio, dataSource,
}: Props) {
  const [range, setRange] = useState<Range>('All');

  const displayed = useMemo(() => {
    const days = DAYS[range];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => new Date(d.date + 'T00:00:00').getTime() >= cutoff);
  }, [data, range]);

  const sharePayload: HashRibbonSharePayload = {
    data: displayed,
    range,
    statusLabel,
    statusColor,
    currentPrice,
    currentMA30,
    currentMA60,
    currentRatio,
    dataSource,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Hash Ribbons — BTC Price + Ribbon Ratio · Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Red shading = capitulation (30d MA below 60d MA) · Right axis = ribbon ratio (30d ÷ 60d)
            {dataSource === 'DiffLast' && ' · Using mining difficulty as hash rate proxy'}
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-mono shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5" style={{ backgroundColor: 'rgba(247,249,252,0.75)' }} />
            <span style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5" style={{ backgroundColor: '#A78BFA' }} />
            <span style={{ color: '#A78BFA' }}>30d / 60d Ratio</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,92,92,0.25)' }} />
            <span style={{ color: '#FF5C5C' }}>Capitulation Zone</span>
          </span>
          <HashRibbonShareModal payload={sharePayload} />
        </div>
      </div>

      {fetchError ? (
        <div
          className="h-[480px] flex items-center justify-center rounded-lg border text-sm"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          Unable to load hash rate data — CoinMetrics API unreachable
        </div>
      ) : (
        <HashRibbonChart data={data} onRangeChange={setRange} />
      )}
    </div>
  );
}
