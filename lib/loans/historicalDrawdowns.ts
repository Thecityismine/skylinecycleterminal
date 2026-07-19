import type { PricePoint } from '@/lib/api/coinmetrics';

export type DrawdownEpisode = { label: string; troughDate: string; drawdownPct: number };

function labelForDates(fromDate: string, toDate: string): string {
  const fromYear = fromDate.slice(0, 4);
  const toYear = toDate.slice(0, 4);
  return fromYear === toYear ? fromYear : `${fromYear}–${toYear}`;
}

// Walks the full BTC price history looking for peak-to-trough episodes whose
// drawdown from the prior all-time-high exceeded `thresholdPct` (a positive
// number, e.g. 64.3 for a 64.3% decline). An episode closes once price
// recovers halfway back toward the prior ATH, to avoid double-counting chop
// within a single bear market as separate events.
export function findHistoricalDrawdownsExceeding(prices: PricePoint[], thresholdPct: number): DrawdownEpisode[] {
  if (!prices.length || thresholdPct <= 0) return [];

  const episodes: DrawdownEpisode[] = [];
  let ath = prices[0].price;
  let athDate = prices[0].time;
  let inEpisode = false;
  let troughPrice = Infinity;
  let troughDate = '';

  const closeEpisode = () => {
    const troughDrawdown = ath > 0 ? ((troughPrice - ath) / ath) * 100 : 0;
    episodes.push({ label: labelForDates(athDate, troughDate), troughDate, drawdownPct: troughDrawdown });
    inEpisode = false;
  };

  for (const p of prices) {
    if (p.price > ath) {
      ath = p.price;
      athDate = p.time;
    }
    const drawdown = ath > 0 ? ((p.price - ath) / ath) * 100 : 0;

    if (!inEpisode && drawdown <= -thresholdPct) {
      inEpisode = true;
      troughPrice = p.price;
      troughDate = p.time;
    } else if (inEpisode) {
      if (p.price < troughPrice) {
        troughPrice = p.price;
        troughDate = p.time;
      }
      const recoveryTarget = troughPrice + (ath - troughPrice) * 0.5;
      if (p.price >= recoveryTarget) closeEpisode();
    }
  }

  if (inEpisode) closeEpisode();

  return episodes;
}
