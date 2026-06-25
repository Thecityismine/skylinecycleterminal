export type FearGreedData = {
  value: number;
  classification: string;
};

export async function fetchFearGreed(): Promise<FearGreedData> {
  const res = await fetch('https://api.alternative.me/fng/?limit=1&format=json', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Fear & Greed HTTP ${res.status}`);
  const json = await res.json();
  const d = json.data[0];
  return {
    value: Number(d.value),
    classification: d.value_classification,
  };
}

// â”€â”€ Historical (up to 2000 days) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type FGPoint = {
  time:    string;   // YYYY-MM-DD
  ts:      number;   // epoch ms
  value:   number;   // 0â€“100
  fgClass: string;   // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
};

export function fgColor(value: number): string {
  if (value >= 75) return '#16a34a';  // extreme greed
  if (value >= 50) return '#65a30d';  // greed
  if (value >= 25) return '#d97706';  // fear
  return '#dc2626';                   // extreme fear
}

export async function fetchFearGreedHistory(): Promise<FGPoint[]> {
  const res = await fetch('https://api.alternative.me/fng/?limit=0', {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Fear & Greed history HTTP ${res.status}`);
  const json = await res.json();

  return (
    json.data as Array<{ value: string; value_classification: string; timestamp: string }>
  )
    .map(d => {
      const ts = Number(d.timestamp) * 1000;
      return {
        time:    new Date(ts).toISOString().slice(0, 10),
        ts,
        value:   Number(d.value),
        fgClass: d.value_classification,
      };
    })
    .reverse();  // API returns newest-first; flip to oldest-first for charting
}
