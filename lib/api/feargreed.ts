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
