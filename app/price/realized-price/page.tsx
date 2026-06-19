import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import type { RealizedPricePoint } from '@/lib/api/coinmetrics';
import { RealizedPriceChart } from '@/components/charts/RealizedPriceChart';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export const revalidate = 86400;

// O(n) sliding window MA — avoids nested loops on large arrays
function computeMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    sum += prices[i];
    if (i >= period) sum -= prices[i - period];
    result.push(i >= period - 1 ? sum / period : null);
  }
  return result;
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function ratioZone(r: number): { label: string; color: string } {
  if (r < 0.9)  return { label: 'Well below 200W MA — Extreme Buy',  color: '#3B82F6' };
  if (r < 1.0)  return { label: 'Below 200W MA — Strong Accumulate', color: '#60A5FA' };
  if (r < 1.5)  return { label: 'Near MA — Accumulate',              color: '#35D07F' };
  if (r < 2.5)  return { label: 'Moderate premium — Hold / Build',   color: '#E6B450' };
  if (r < 4.0)  return { label: 'High premium — Caution',            color: '#F97316' };
  return               { label: 'Extreme premium — Distribute',       color: '#FF5C5C' };
}

export default async function RealizedPricePage() {
  // Fetch from 2010 so 200W MA (1400-day) has enough history
  let rawPrices;
  try {
    rawPrices = await fetchBTCDailyPrice('2010-01-01');
  } catch {
    return (
      <div className="max-w-[1400px] mx-auto">
        <PageHeader title="BTC Price / 200-Week MA" subtitle="Average cost basis of all BTC in circulation" />
        <p className="mt-8 text-sm" style={{ color: 'var(--sct-muted)' }}>
          Unable to load price data. CoinMetrics may be temporarily unavailable.
        </p>
      </div>
    );
  }

  // Compute 200-week (1400-day) MA — the "Bitcoin Investor Tool"
  const MA_PERIOD = 1400;
  const maValues = computeMA(rawPrices.map((p) => p.price), MA_PERIOD);

  const data: RealizedPricePoint[] = rawPrices.map((p, i) => ({
    time:     p.time,
    price:    p.price,
    realized: maValues[i],
  }));

  const latest       = data[data.length - 1];
  const currentPrice = latest?.price ?? 0;
  const ma200w       = latest?.realized ?? null;
  const ratio        = ma200w ? currentPrice / ma200w : null;
  const premium      = ma200w ? ((currentPrice - ma200w) / ma200w) * 100 : null;
  const zone         = ratio ? ratioZone(ratio) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="BTC Price vs 200-Week MA"
        subtitle="The Bitcoin Investor Tool — no BTC weekly close has ever broken below the 200-week MA"
        regime={
          ratio == null    ? undefined
          : ratio < 1.0    ? 'accumulate'
          : ratio < 2.0    ? 'hold'
          : ratio < 3.5    ? 'caution'
          : 'distribution'
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          label="BTC Price"
          value={fmtUSD(currentPrice)}
          accent="var(--sct-btc)"
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="200-Week MA"
          value={ma200w ? fmtUSD(ma200w) : '—'}
          sub="Long-term cost basis proxy"
          accent="#E879F9"
          freshness="daily"
          source="Calculated"
        />
        <StatCard
          label="Price / 200W MA"
          value={ratio ? `${ratio.toFixed(2)}×` : '—'}
          sub={zone?.label ?? '—'}
          accent={zone?.color ?? 'var(--sct-muted)'}
          freshness="daily"
          source="Calculated"
        />
        <StatCard
          label="Premium to MA"
          value={premium != null ? `${premium >= 0 ? '+' : ''}${premium.toFixed(1)}%` : '—'}
          sub={
            premium == null    ? '—'
            : premium < 0      ? 'Trading below support — historic buy'
            : premium < 50     ? 'Near MA — low risk accumulation'
            : premium < 200    ? 'Moderate premium — hold'
            : 'Elevated premium — caution'
          }
          trend={premium != null ? (premium >= 0 ? 'up' : 'down') : undefined}
          accent={
            premium == null    ? 'var(--sct-muted)'
            : premium < 0      ? '#3B82F6'
            : premium < 100    ? '#35D07F'
            : premium < 300    ? '#E6B450'
            : '#FF5C5C'
          }
          freshness="daily"
          source="Calculated"
        />
      </div>

      {/* Chart */}
      <RealizedPriceChart
        data={data}
        realizedAvailable={true}
        secondaryLabel="200-Week MA"
        secondaryColor="#E879F9"
      />

      {/* Insight panels */}
      <div className="grid grid-cols-3 gap-6">
        <InsightPanel title="Current Signal">
          <InsightRow label="BTC Price"     value={fmtUSD(currentPrice)}                valueColor="var(--sct-btc)" />
          <InsightRow label="200-Week MA"   value={ma200w ? fmtUSD(ma200w) : '—'}        valueColor="#E879F9" />
          <InsightRow label="Ratio"         value={ratio ? `${ratio.toFixed(2)}×` : '—'} valueColor={zone?.color} />
          <InsightRow label="Signal"        value={zone?.label ?? '—'}                   valueColor={zone?.color} />
          <InsightRow label="Premium"       value={premium != null ? `${premium.toFixed(1)}%` : '—'} />
        </InsightPanel>

        <InsightPanel title="Historical Premium Ranges">
          <InsightRow label="< 1.0× (below MA)" value="Generational buy — never sustained"    valueColor="#3B82F6" />
          <InsightRow label="1.0–1.5×"           value="Near MA — strong accumulation zone"    valueColor="#35D07F" />
          <InsightRow label="1.5–2.5×"           value="Moderate premium — hold / build"       valueColor="#E6B450" />
          <InsightRow label="2.5–4.0×"           value="High premium — reduce exposure"        valueColor="#F97316" />
          <InsightRow label="> 4.0×"             value="Extreme premium — cycle top territory" valueColor="#FF5C5C" />
        </InsightPanel>

        <InsightPanel title="About the 200-Week MA">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            The 200-Week Moving Average (≈4 year MA) is the best-known long-term support indicator in Bitcoin.
            No weekly candle has ever closed below it in BTC history.
          </p>
          <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--sct-muted)' }}>
            It closely tracks the Realized Price (average cost basis of all BTC holders) and
            represents the floor below which even the most distressed bear markets have not broken.
            Touching the MA is historically a multi-year low-risk accumulation window.
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--sct-muted)' }}>
            True Realized Price (CapRealUSD) requires CoinMetrics Pro.
          </p>
        </InsightPanel>
      </div>
    </div>
  );
}
