// DeFiLlama Stablecoins API — completely free, no key required
// Docs: https://stablecoins.llama.fi

export type StablecoinData = {
  totalCirculating: number;  // total stablecoin market cap in USD
  fetchedAt: string;
};

export type StablecoinHistoryPoint = {
  time: string;       // "YYYY-MM-DD"
  ts: number;         // unix ms
  stablecoinMC: number; // USD
};

function extractPeggedUSD(item: Record<string, unknown>): number | null {
  const usdVal =
    (item.totalCirculatingUSD as Record<string, number> | undefined)?.peggedUSD ??
    (item.totalCirculating    as Record<string, number> | undefined)?.peggedUSD;
  const v = Number(usdVal);
  return usdVal != null && !isNaN(v) && v > 0 ? v : null;
}

export async function fetchStablecoinSupply(): Promise<StablecoinData | null> {
  try {
    const res = await fetch('https://stablecoins.llama.fi/stablecoincharts/all', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`DeFiLlama HTTP ${res.status}`);

    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const latest = data[data.length - 1] as Record<string, unknown>;
    const usdVal = extractPeggedUSD(latest);
    if (!usdVal) return null;

    return {
      totalCirculating: usdVal,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[DeFiLlama] Stablecoin fetch failed:', err);
    return null;
  }
}

export async function fetchStablecoinHistory(): Promise<StablecoinHistoryPoint[]> {
  try {
    const res = await fetch('https://stablecoins.llama.fi/stablecoincharts/all', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`DeFiLlama HTTP ${res.status}`);

    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const points: StablecoinHistoryPoint[] = [];

    for (const item of data as Record<string, unknown>[]) {
      const dateUnix = Number(item.date);
      if (isNaN(dateUnix) || dateUnix <= 0) continue;

      const stablecoinMC = extractPeggedUSD(item);
      if (stablecoinMC == null) continue;

      const ts   = dateUnix * 1000;
      const time = new Date(ts).toISOString().slice(0, 10);
      points.push({ time, ts, stablecoinMC });
    }

    return points.sort((a, b) => a.ts - b.ts);
  } catch (err) {
    console.warn('[DeFiLlama] Stablecoin history fetch failed:', err);
    return [];
  }
}
