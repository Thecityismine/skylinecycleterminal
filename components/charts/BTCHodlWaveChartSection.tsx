"use client";

import { useState, useMemo } from 'react';
import { BTCHodlWaveChart }     from '@/components/charts/BTCHodlWaveChart';
import { HodlWaveShareModal }   from '@/components/share/HodlWaveShareModal';
import type { HodlWavePoint }   from '@/lib/indicators/exchangeReserve';
import type { HodlWaveSharePayload } from '@/components/share/HodlWaveShareCard';

type Props = {
  points:      HodlWavePoint[];
  regimeLabel: string;
  regimeColor: string;
  exchPct:     number | null;
  change30d:   number | null;
  change90d:   number | null;
  btcClose:    number | null;
  scoreScore:  number;
  scoreLabel:  string;
  scoreColor:  string;
};

export function BTCHodlWaveChartSection({
  points, regimeLabel, regimeColor,
  exchPct, change30d, change90d, btcClose,
  scoreScore, scoreLabel, scoreColor,
}: Props) {
  // Mirror toggle defaults from BTCHodlWaveChart
  const [showPrice,    setShowPrice]    = useState(true);
  const [show30d,      setShow30d]      = useState(false);
  const [show90d,      setShow90d]      = useState(true);
  const [showHalvings, setShowHalvings] = useState(true);
  const [showEvents,   setShowEvents]   = useState(true);

  // Downsample to ~1500 points for share card performance
  const downsampled = useMemo(() => {
    if (points.length <= 1500) return points;
    const step = Math.floor(points.length / 1500);
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points]);

  const sharePayload: HodlWaveSharePayload = {
    points: downsampled,
    showPrice,
    show30d,
    show90d,
    showHalvings,
    showEvents,
    regimeLabel,
    regimeColor,
    exchPct,
    change30d,
    change90d,
    btcClose,
    scoreScore,
    scoreLabel,
    scoreColor,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-secondary)' }}>
            BTC Exchange Reserve — % of Circulating Supply
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Orange area = BTC supply on exchanges (left axis) · Gray line = BTC price log scale (right axis)
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded" style={{ backgroundColor: '#F7931A', display: 'inline-block' }} />
              Exchange %
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded" style={{ backgroundColor: '#3B82F6', display: 'inline-block' }} />
              90D SMA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded" style={{ backgroundColor: 'rgba(230,237,243,0.6)', display: 'inline-block' }} />
              BTC Price
            </span>
          </div>
          <HodlWaveShareModal payload={sharePayload} />
        </div>
      </div>

      <div style={{ height: 420 }}>
        {!points.length
          ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">No data available</p>
            </div>
          )
          : (
            <BTCHodlWaveChart
              points={points}
              range="all"
              onShowPriceChange={setShowPrice}
              onShow30dChange={setShow30d}
              onShow90dChange={setShow90d}
              onShowHalvingsChange={setShowHalvings}
              onShowEventsChange={setShowEvents}
            />
          )
        }
      </div>

      <p className="text-[10px] mt-2" style={{ color: 'var(--sct-muted)' }}>
        Source: CoinMetrics Community API (SplyExNtv, SplyCur, PriceUSD). Data available from ~2016.
        Dashed verticals mark Bitcoin halvings. Colored verticals mark cycle peaks and bear-market lows.
      </p>
    </div>
  );
}
