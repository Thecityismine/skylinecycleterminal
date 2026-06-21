"use client";

/**
 * Absolute-positioned Skyline watermark for chart containers.
 * Parent div must have position: relative (or className="relative").
 *
 * The logo PNGs have a white background, so we use:
 *   filter: invert(1) brightness(1.8)  →  gray icon becomes bright, white bg → black
 *   mix-blend-mode: screen             →  black bg disappears, leaving light icon on dark chart
 */

type Props = {
  /** 'icon' = just the building mark; 'full' = full horizontal logo */
  variant?: 'icon' | 'full';
  opacity?: number;
};

export function ChartWatermark({ variant = 'icon', opacity = 0.14 }: Props) {
  const isIcon = variant === 'icon';
  return (
    <div
      aria-hidden
      style={{
        position:      'absolute',
        bottom:        '1.25rem',
        right:         '4.25rem',   // leave room for recharts Y-axis
        pointerEvents: 'none',
        userSelect:    'none',
        opacity,
        mixBlendMode:  'screen',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={isIcon ? '/skyline-icon.png' : '/skyline-full.png'}
        alt=""
        style={{
          display:  'block',
          width:    isIcon ? 34 : 120,
          height:   'auto',
          filter:   'invert(1) brightness(1.8)',
        }}
      />
    </div>
  );
}
