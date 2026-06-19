export type PricePoint = {
  time: string;  // "YYYY-MM-DD"
  price: number;
};

export async function fetchBTCDailyPrice(startTime = '2012-01-01'): Promise<PricePoint[]> {
  const all: PricePoint[] = [];
  let nextPageToken: string | null = null;

  do {
    const url = new URL('https://community-api.coinmetrics.io/v4/timeseries/asset-metrics');
    url.searchParams.set('assets', 'btc');
    url.searchParams.set('metrics', 'PriceUSD');
    url.searchParams.set('frequency', '1d');
    url.searchParams.set('start_time', startTime);
    url.searchParams.set('page_size', '10000');
    if (nextPageToken) url.searchParams.set('next_page_token', nextPageToken);

    const res = await fetch(url.toString(), {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`CoinMetrics HTTP ${res.status}`);

    const json = await res.json();

    for (const d of json.data ?? []) {
      if (d.PriceUSD != null) {
        all.push({ time: d.time.slice(0, 10), price: Number(d.PriceUSD) });
      }
    }

    nextPageToken = json.next_page_token ?? null;
  } while (nextPageToken);

  return all;
}
