"use client";

import { useLiveSpot } from '@/lib/share/liveSpot';

// The BTC price in a page's signal banner.
//
// Same problem BtcPriceStat solves, one element higher up the page. The banner
// carries the largest number on the screen, so when it held the daily close and
// the stat card below it held live spot, the page disagreed with itself in the
// most visible place available. Three pages did exactly that.
//
// A client component for the same reason BtcPriceStat is one: the pages that
// render this banner are server components, and this is what lets the price
// track spot without making the whole page dynamic.

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

export function BtcPriceBanner({
  close,
}: {
  /** The latest daily close, used until live spot arrives and if it never does. */
  close: number | null | undefined;
}) {
  const { price } = useLiveSpot();
  const live = price != null;

  return (
    <div className="hidden sm:block text-right shrink-0">
      <p className="text-2xl font-mono font-bold" style={{ color: '#F7931A' }}>
        {fmtUSD(live ? price : (close ?? null))}
      </p>
      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
        BTC Price · {live ? 'live spot' : 'latest close'}
      </p>
    </div>
  );
}
