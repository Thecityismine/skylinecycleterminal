"use client";

import { useState, useMemo } from 'react';
import { BTCDrawdownChart }  from '@/components/charts/BTCDrawdownChart';
import type { DrawdownPoint } from '@/lib/indicators/drawdownFromATH';
import { DrawdownShareModal } from '@/components/share/DrawdownShareModal';
import type { DrawdownSharePayload } from '@/components/share/DrawdownShareCard';

type Timeframe = 'All' | '4Y' | '2Y';
const TIMEFRAMES: Timeframe[] = ['All', '4Y', '2Y'];
const TF_DAYS: Record<Timeframe, number> = { All: Infinity, '4Y': 1460, '2Y': 730 };

type Props = {
  data:            DrawdownPoint[];
  currentDD:       number;
  currentATH:      number;
  currentPrice:    number;
  athDate:         string;
  daysSinceATH:    number;
  recovery:        number;
  currentCycleMax: number;
  regimeLabel:     string;
  regimeColor:     string;
};

export function BTCDrawdownPageClient({
  data,
  currentDD, currentATH, currentPrice, athDate, daysSinceATH, recovery, currentCycleMax,
  regimeLabel, regimeColor,
}: Props) {
  const [timeframe,    setTimeframe]    = useState<Timeframe>('All');
  const [showHalvings, setShowHalvings] = useState(true);
  const [showCycles,   setShowCycles]   = useState(true);

  const displayed = useMemo(() => {
    const days = TF_DAYS[timeframe];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => d.ts >= cutoff);
  }, [data, timeframe]);

  const sharePayload: DrawdownSharePayload = {
    data: displayed,
    timeframe,
    showHalvings,
    showCycles,
    currentDD,
    currentATH,
    currentPrice,
    athDate,
    daysSinceATH,
    recovery,
    currentCycleMax,
    regimeLabel,
    regimeColor,
    generatedAt: new Date().toISOString(),
  };

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
            Drawdown From Running ATH
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Daily close · shaded zones show historical drawdown severity ranges
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
          {toggleBtn(showHalvings, 'Halvings', '#F7931A', () => setShowHalvings(v => !v))}
          {toggleBtn(showCycles,   'Cycle Lows', '#FF5C5C', () => setShowCycles(v => !v))}
          <div className="w-px mx-0.5" style={{ backgroundColor: 'var(--sct-border)' }} />
          <DrawdownShareModal payload={sharePayload} />
        </div>
      </div>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {[
          { color: '#35D07F', label: 'Near Highs (>−15%)' },
          { color: '#E6B450', label: 'Normal Correction (−15 to −30%)' },
          { color: '#F97316', label: 'Deep Pullback (−30 to −50%)' },
          { color: '#FF5C5C', label: 'Bear Market (−50 to −70%)' },
          { color: '#B91C1C', label: 'Capitulation (<−70%)' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: color + '70' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="relative h-[440px]">
        <BTCDrawdownChart
          data={displayed}
          showHalvings={showHalvings}
          showCycles={showCycles}
        />
      </div>
    </div>
  );
}
