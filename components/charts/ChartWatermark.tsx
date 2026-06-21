"use client";

/**
 * Chart watermark — renders two overlays:
 *   1. Large icon centered in the chart area (subtle, like TradingView)
 *   2. Full horizontal logo at bottom-right, above the x-axis date labels
 *
 * PNG files have white backgrounds so we use:
 *   filter: invert(1) brightness(1.8)  → gray icon becomes bright, white bg → black
 *   mix-blend-mode: screen             → black disappears, light mark remains on dark chart
 */

const FILTER = 'invert(1) brightness(1.8)';
const BLEND  = 'screen' as const;

export function ChartWatermark() {
  return (
    <div
      aria-hidden
      style={{
        position:      'absolute',
        top:           '50%',
        left:          '50%',
        transform:     'translate(-50%, -50%)',
        pointerEvents: 'none',
        userSelect:    'none',
        opacity:       0.25,
        mixBlendMode:  BLEND,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/skyline-full.png"
        alt=""
        style={{ display: 'block', width: 220, height: 'auto', filter: FILTER }}
      />
    </div>
  );
}
