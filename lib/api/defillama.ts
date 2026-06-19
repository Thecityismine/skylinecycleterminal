// DeFiLlama Stablecoins API — completely free, no key required
// Docs: https://stablecoins.llama.fi

export type StablecoinData = {
  totalCirculating: number;  // total stablecoin market cap in USD
  fetchedAt: string;
};

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

    // API returns { totalCirculatingUSD: { peggedUSD: number } } or { totalCirculating: { peggedUSD: number } }
    const usdVal =
      (latest.totalCirculatingUSD as Record<string, number> | undefined)?.peggedUSD ??
      (latest.totalCirculating  as Record<string, number> | undefined)?.peggedUSD;

    if (!usdVal || isNaN(Number(usdVal))) return null;

    return {
      totalCirculating: Number(usdVal),
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[DeFiLlama] Stablecoin fetch failed:', err);
    return null;
  }
}
