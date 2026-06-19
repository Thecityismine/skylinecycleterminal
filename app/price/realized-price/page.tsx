import { fetchBTCRealizedPrice } from '@/lib/api/coinmetrics';
import { RealizedPriceChart } from '@/components/charts/RealizedPriceChart';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export const revalidate = 86400;

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function mvrvZone(mvrv: number): { label: string; color: string } {
  if (mvrv < 1.0) return { label: 'Below Realized — Strong Accumulate', color: '#3B82F6' };
  if (mvrv < 1.5) return { label: 'Near Realized — Accumulate',          color: '#35D07F' };
  if (mvrv < 2.5) return { label: 'Moderate Premium — Hold / Build',     color: '#E6B450' };
  if (mvrv < 3.5) return { label: 'High Premium — Caution',              color: '#F97316' };
  return                  { label: 'Extreme Premium — Distribution',      color: '#FF5C5C' };
}

export default async function RealizedPricePage() {
  let data;
  try {
    data = await fetchBTCRealizedPrice('2012-01-01');
  } catch {
    return (
      <div className="max-w-[1400px] mx-auto">
        <PageHeader title="Realized Price" subtitle="Average cost basis of all BTC in circulation" />
        <p className="mt-8 text-sm" style={{ color: 'var(--sct-muted)' }}>
          Unable to load price data. CoinMetrics may be temporarily unavailable.
        </p>
      </div>
    );
  }

  const latest          = data[data.length - 1];
  const currentPrice    = latest?.price ?? 0;
  const realizedPrice   = latest?.realized ?? null;
  const realizedAvail   = data.some((d) => d.realized != null);
  const mvrv            = realizedPrice ? currentPrice / realizedPrice : null;
  const unrealizedPnL   = realizedPrice
    ? ((currentPrice - realizedPrice) / realizedPrice) * 100
    : null;
  const zone = mvrv ? mvrvZone(mvrv) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Avg Buy Price / Realized Price"
        subtitle="Average cost basis of all BTC in circulation vs. current market price"
        regime={
          mvrv == null     ? undefined
          : mvrv < 1.0     ? 'accumulate'
          : mvrv < 2.0     ? 'hold'
          : mvrv < 3.0     ? 'caution'
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
          label="Realized Price"
          value={realizedPrice ? fmtUSD(realizedPrice) : '—'}
          sub={realizedAvail ? 'Avg cost basis of all BTC' : 'CoinMetrics Pro required'}
          accent={realizedAvail ? '#E879F9' : 'var(--sct-muted)'}
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="MVRV Ratio"
          value={mvrv ? `${mvrv.toFixed(2)}×` : '—'}
          sub={zone?.label ?? 'Price / Realized Price'}
          accent={zone?.color ?? 'var(--sct-muted)'}
          freshness="daily"
          source="Calculated"
        />
        <StatCard
          label="Unrealized P&L"
          value={unrealizedPnL != null ? `${unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(1)}%` : '—'}
          sub={unrealizedPnL != null
            ? unrealizedPnL >= 0
              ? 'Avg holder is in profit'
              : 'Avg holder is at a loss'
            : 'Requires Realized Price'
          }
          trend={unrealizedPnL != null ? (unrealizedPnL >= 0 ? 'up' : 'down') : undefined}
          accent={
            unrealizedPnL == null      ? 'var(--sct-muted)'
            : unrealizedPnL > 100      ? '#FF5C5C'
            : unrealizedPnL > 0        ? '#35D07F'
            : '#3B82F6'
          }
          freshness="daily"
          source="Calculated"
        />
      </div>

      {/* Chart */}
      <RealizedPriceChart data={data} realizedAvailable={realizedAvail} />

      {/* Insight panel */}
      <div className="grid grid-cols-3 gap-6">
        <InsightPanel title="MVRV Interpretation">
          <InsightRow label="Current MVRV"     value={mvrv ? `${mvrv.toFixed(2)}×` : '—'} valueColor={zone?.color} />
          <InsightRow label="Realized Price"   value={realizedPrice ? fmtUSD(realizedPrice) : '—'} />
          <InsightRow label="BTC Price"        value={fmtUSD(currentPrice)} valueColor="var(--sct-btc)" />
          <InsightRow label="Signal"           value={zone?.label ?? '—'} valueColor={zone?.color} />
        </InsightPanel>

        <InsightPanel title="Historical MVRV Ranges">
          <InsightRow label="< 1.0×"  value="Below cost basis — Generational buy" valueColor="#3B82F6" />
          <InsightRow label="1–1.5×"  value="Near realized — Accumulate"           valueColor="#35D07F" />
          <InsightRow label="1.5–2.5×" value="Moderate premium — Hold"             valueColor="#E6B450" />
          <InsightRow label="2.5–3.5×" value="High premium — Reduce exposure"      valueColor="#F97316" />
          <InsightRow label="> 3.5×"  value="Cycle top territory — Distribute"     valueColor="#FF5C5C" />
        </InsightPanel>

        <InsightPanel title="About Realized Price">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            The Realized Price (also called Average Buy Price) is the average price at which all
            existing Bitcoin last changed hands — essentially the aggregate cost basis of all holders.
          </p>
          <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--sct-muted)' }}>
            When BTC trades <span style={{ color: '#3B82F6' }}>below</span> Realized Price, the
            average holder is at a loss — historically the strongest accumulation signal in BTC history.
            When trading at 3–5× above, distribution is historically optimal.
          </p>
        </InsightPanel>
      </div>
    </div>
  );
}
