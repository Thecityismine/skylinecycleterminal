"use client";

import { useApiData } from '@/lib/hooks/useApiData';

// Live spot price for share cards.
//
// On-chain charts are built on daily closes, because a 200-day average or an
// MVRV ratio cannot be computed from a live tick. That is correct for the
// chart and wrong for the headline number on a card going to social media:
// the newest close is yesterday's until the UTC day ends, so a card published
// at noon shows a price the reader can see is stale, and the chart loses
// credibility over a number that was never claiming to be current.
//
// So the card shows both. Live spot as the headline, the close date on the
// series, each labelled for what it is.

export type LiveSpot = { price: number | null; asOf: string | null };

type MarketSnapshot = { btcPrice: number };

export function useLiveSpot(): LiveSpot {
  const { data } = useApiData<MarketSnapshot>('/api/market');
  return {
    price: data?.btcPrice ?? null,
    asOf:  data ? new Date().toISOString() : null,
  };
}

/** "Aug 21" from an ISO date, for labelling which close a figure came from. */
export function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
