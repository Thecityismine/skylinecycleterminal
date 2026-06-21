"use client";

import { useState } from 'react';
import { BtcM2Chart }      from '@/components/charts/BtcM2Chart';
import { ChartWatermark }  from '@/components/charts/ChartWatermark';
import type { BtcM2Point } from '@/lib/indicators/btcM2';

type Props = { points: BtcM2Point[] };

export function BtcM2PageClient({ points }: Props) {
  const [logScale, setLogScale] = useState(false);

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Weekly · BTC Price ÷ US M2 Money Supply
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Ratio scaled ×1000 · removes monetary expansion from price — from 2012
          </p>
        </div>

        <button
          onClick={() => setLogScale(v => !v)}
          className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
          style={{
            backgroundColor: logScale ? '#A855F720' : 'transparent',
            borderColor:     logScale ? '#A855F7'   : 'var(--sct-border)',
            color:           logScale ? '#A855F7'   : 'var(--sct-muted)',
          }}
        >
          LOG
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {[
          { color: 'rgba(247,249,252,0.85)', label: 'BTC / M2 Ratio' },
          { color: '#35D07F',               label: '200 EMA' },
          { color: '#FF5C5C',               label: '400 EMA' },
          { color: '#E6B450',               label: '52 SMA', dashed: true },
        ].map(({ color, label, dashed }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs font-mono"
            style={{ color: 'var(--sct-muted)' }}
          >
            <span
              style={{
                display:         'inline-block',
                width:           24,
                height:          dashed ? 0 : 1.5,
                backgroundColor: dashed ? undefined : color,
                borderTop:       dashed ? `2px dashed ${color}` : undefined,
              }}
            />
            {label}
          </span>
        ))}
      </div>

      <div className="relative h-[480px]">
        <BtcM2Chart data={points} logScale={logScale} />
        <ChartWatermark />
      </div>
    </div>
  );
}
