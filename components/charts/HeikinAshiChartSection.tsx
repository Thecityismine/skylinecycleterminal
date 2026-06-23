"use client";

import { HeikinAshiChart } from '@/components/charts/HeikinAshiChart';
import type { HACandle }   from '@/components/charts/HeikinAshiChart';
import { HeikinAshiShareModal } from '@/components/share/HeikinAshiShareModal';
import type { HeikinAshiSharePayload } from '@/components/share/HeikinAshiShareCard';

type Props = {
  candles:    HACandle[];
  latest:     HACandle | null;
  lastSig:    HACandle | null;
  signalGain: number | null;
  fetchError: boolean;
};

export function HeikinAshiChartSection({ candles, latest, lastSig, signalGain, fetchError }: Props) {
  const sharePayload: HeikinAshiSharePayload = {
    candles,
    latest,
    lastSig,
    signalGain,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTC / USD — Monthly Heikin-Ashi · Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Hover any candle for values · ▲ = bear market end signal (first green after 3+ red months)
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#35D07F' }} />
            <span style={{ color: '#35D07F' }}>Bullish HA</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FF5C5C' }} />
            <span style={{ color: '#FF5C5C' }}>Bearish HA</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-base leading-none" style={{ color: '#35D07F' }}>▲</span>
            <span style={{ color: 'var(--sct-muted)' }}>Bear-End Signal</span>
          </span>
          {!fetchError && candles.length > 0 && (
            <HeikinAshiShareModal payload={sharePayload} />
          )}
        </div>
      </div>

      {fetchError ? (
        <div
          className="h-[440px] flex items-center justify-center rounded-lg border text-sm"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          Unable to load price data — CoinMetrics API unreachable
        </div>
      ) : (
        <HeikinAshiChart candles={candles} />
      )}
    </div>
  );
}
