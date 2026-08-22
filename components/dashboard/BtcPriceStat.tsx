"use client";

import { StatCard } from '@/components/dashboard/StatCard';
import { useLiveSpot } from '@/lib/share/liveSpot';

// The BTC price stat on a chart page.
//
// Chart pages are built on daily closes, because a 200-day average, MVRV or a
// realized price cannot be computed from a live tick. The newest close is
// yesterday's until the UTC day ends, which is correct for the chart and wrong
// for the one number a reader will check against an exchange.
//
// So the stat shows live spot and says so, while everything around it stays on
// the close. This is the same treatment the share cards got: the two surfaces
// have to agree, or the page contradicts the card generated from it.
//
// A client component on purpose. Most of these pages are server components, and
// rendering this inside them is what lets the price update without turning the
// whole page dynamic.

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

export function BtcPriceStat({
  close,
  label = 'BTC Price',
  accent = '#F7931A',
}: {
  /** The latest daily close, used until live spot arrives and if it never does. */
  close: number | null | undefined;
  label?: string;
  accent?: string;
}) {
  const { price } = useLiveSpot();
  const live = price != null;

  return (
    <StatCard
      label={label}
      value={fmtUSD(live ? price : (close ?? null))}
      sub={live ? 'Live spot' : 'Latest close'}
      accent={accent}
      freshness={live ? 'live' : 'daily'}
    />
  );
}
