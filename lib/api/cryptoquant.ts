// CryptoQuant API — on-chain analytics
// Free tier: 50 req/day, 7-day history, personal use
// Auth: Bearer token in Authorization header

export type MVRVData = {
  mvrv: number;
  source: 'cryptoquant';
  fetchedAt: string;
};

// Known endpoint patterns for MVRV across CryptoQuant API versions
// We try each in order until one succeeds.
const MVRV_ENDPOINT_CANDIDATES = [
  'https://api.cryptoquant.com/v1/btc/market-data/mvrv',
  'https://api.cryptoquant.com/v1/btc/market-data/mvrv-ratio',
  'https://api.cryptoquant.com/v1/btc/indicators/mvrv',
  'https://api.cryptoquant.com/v1/btc/mvrv',
];

function extractMVRV(json: unknown): number | null {
  if (!json || typeof json !== 'object') return null;
  const j = json as Record<string, unknown>;

  // Shape 1: { result: { data: [{ date, mvrv }] } }
  const rows1 = (j.result as Record<string, unknown>)?.data;
  if (Array.isArray(rows1) && rows1.length > 0) {
    const last = rows1[rows1.length - 1] as Record<string, unknown>;
    const v = Number(last.mvrv ?? last.value ?? last.mvrv_ratio);
    if (v && !isNaN(v)) return v;
  }

  // Shape 2: { data: [{ date, value }] }
  if (Array.isArray(j.data) && j.data.length > 0) {
    const last = j.data[j.data.length - 1] as Record<string, unknown>;
    const v = Number(last.mvrv ?? last.value ?? last.mvrv_ratio);
    if (v && !isNaN(v)) return v;
  }

  return null;
}

export async function fetchMVRV(): Promise<MVRVData | null> {
  const key = process.env.CRYPTOQUANT_API_KEY;
  if (!key) return null;

  const today = new Date().toISOString().slice(0, 10);
  const past  = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const qs    = `?window=day&from=${past}&to=${today}`;

  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };

  for (const base of MVRV_ENDPOINT_CANDIDATES) {
    try {
      const res = await fetch(base + qs, {
        headers,
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 404) continue;  // wrong path, try next

      if (!res.ok) {
        console.warn(`[CryptoQuant] ${res.status} at ${base}`);
        continue;
      }

      const json = await res.json();
      const mvrv = extractMVRV(json);
      if (mvrv) {
        console.log(`[CryptoQuant] MVRV ${mvrv.toFixed(2)} from ${base}`);
        return { mvrv, source: 'cryptoquant', fetchedAt: new Date().toISOString() };
      }
    } catch {
      // timeout or network error — try next candidate
    }
  }

  console.warn('[CryptoQuant] All MVRV endpoints failed — using proxy');
  return null;
}
