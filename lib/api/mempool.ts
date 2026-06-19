// Mempool.space API — completely free, no key required
// Docs: https://mempool.space/docs/api/rest

export type HashratePoint = {
  timestamp: number;    // Unix seconds
  avgHashrate: number;  // hashes per second
};

export type HashrateData = {
  points: HashratePoint[];
  currentHashrate: number;
  fetchedAt: string;
};

export async function fetchHashrate(): Promise<HashrateData | null> {
  try {
    const res = await fetch('https://mempool.space/api/v1/mining/hashrate/3y', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`Mempool HTTP ${res.status}`);

    const json = await res.json();

    const points: HashratePoint[] = (json.hashrates ?? []).map(
      (h: Record<string, number>) => ({
        timestamp:   h.timestamp,
        avgHashrate: h.avgHashrate,
      })
    );

    if (points.length < 90) return null;

    return {
      points,
      currentHashrate: json.currentHashrate ?? 0,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Mempool] Hashrate fetch failed:', err);
    return null;
  }
}
