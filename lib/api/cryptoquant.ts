// CryptoQuant API — on-chain analytics
// Free tier key: cryptoquant.com
// Auth: Bearer token in Authorization header

export type MVRVData = {
  mvrv: number;       // current MVRV ratio (e.g., 2.34)
  fetchedAt: string;
};

export async function fetchMVRV(): Promise<MVRVData | null> {
  const key = process.env.CRYPTOQUANT_API_KEY;
  if (!key) return null;

  const today = new Date().toISOString().slice(0, 10);
  const past  = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const url =
    `https://api.cryptoquant.com/v1/btc/market-data/mvrv` +
    `?window=day&from=${past}&to=${today}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[CryptoQuant] HTTP ${res.status} — falling back to MVRV proxy`);
      return null;
    }

    const json = await res.json();

    // CryptoQuant response shape: { status, result: { data: [{ date, mvrv }] } }
    // Try multiple known field names since their schema can vary by tier
    const rows: Array<Record<string, unknown>> =
      json?.result?.data ?? json?.data ?? [];

    if (rows.length === 0) return null;

    const latest = rows[rows.length - 1];
    const mvrv =
      Number(latest.mvrv ?? latest.value ?? latest.mvrv_ratio ?? 0);

    if (!mvrv || isNaN(mvrv)) return null;

    return { mvrv, fetchedAt: new Date().toISOString() };
  } catch (err) {
    console.warn('[CryptoQuant] fetch failed — falling back to MVRV proxy:', err);
    return null;
  }
}
