import { NextResponse } from 'next/server';
import { fetchOnChainMetrics } from '@/lib/api/coinmetrics';

export const revalidate = 86400;

function sma(arr: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= period) sum -= arr[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export async function GET() {
  try {
    const raw = await fetchOnChainMetrics('2020-01-01');

    const prices    = raw.map(d => d.price       ?? 0);
    const txCnts    = raw.map(d => d.txCnt        ?? 0);
    const addrCnts  = raw.map(d => d.adrActCnt    ?? 0);
    const marketCaps = raw.map(d => d.marketCap   ?? 0);
    const issuances = raw.map(d =>
      d.issTotNtv != null && d.price != null ? d.issTotNtv * d.price : 0
    );

    const sma200p   = sma(prices, 200);
    const sma365iss = sma(issuances, 365);
    const sma90tx   = sma(txCnts, 90);
    const sma30addr = sma(addrCnts, 30);

    const points = raw.map((d, i) => {
      const p200   = sma200p[i];
      const iss365 = sma365iss[i];
      const tx90   = sma90tx[i];
      const addr30 = sma30addr[i];

      return {
        time:        d.time,
        price:       d.price,
        // MVRV proxy: current price relative to 200-day average cost basis
        mvrvProxy:   d.price != null && p200 != null && p200 > 0
                       ? +(d.price / p200).toFixed(3) : null,
        // Puell Multiple: daily miner revenue vs 365d avg
        puell:       issuances[i] > 0 && iss365 != null && iss365 > 0
                       ? +(issuances[i] / iss365).toFixed(3) : null,
        // NVT proxy: network value per transaction (in $K)
        nvt:         marketCaps[i] > 0 && tx90 != null && tx90 > 0
                       ? +(marketCaps[i] / tx90 / 1_000).toFixed(1) : null,
        // Active addresses 30d MA (in thousands)
        addresses:   addr30 != null ? +(addr30 / 1_000).toFixed(1) : null,
      };
    });

    // Current values (last non-null)
    const last = [...points].reverse();
    const current = {
      mvrvProxy:  last.find(p => p.mvrvProxy  != null)?.mvrvProxy  ?? null,
      puell:      last.find(p => p.puell      != null)?.puell      ?? null,
      nvt:        last.find(p => p.nvt        != null)?.nvt        ?? null,
      addresses:  last.find(p => p.addresses  != null)?.addresses  ?? null,
      price:      last.find(p => p.price      != null)?.price      ?? null,
    };

    return NextResponse.json({ points, current });
  } catch (err) {
    console.error('[/api/onchain]', err);
    return NextResponse.json({ error: 'Failed to fetch on-chain data' }, { status: 500 });
  }
}
