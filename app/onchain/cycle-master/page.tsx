import { fetchCycleMasterData } from '@/lib/api/coinmetrics';
import { computeCycleMaster, scoreCycleMaster } from '@/lib/indicators/cycleMaster';
import type { CycleMasterPoint } from '@/lib/indicators/cycleMaster';
import { CycleMasterChartSection } from '@/components/charts/CycleMasterChartSection';
import { CDDChart } from '@/components/charts/CDDChart';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';

export const revalidate = 86400;

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtUSD(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function pctRelToPrice(price: number, target: number | null): string {
  if (target == null) return '—';
  const pct = ((target - price) / price) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% vs price`;
}

// ─── Zone table data ──────────────────────────────────────────────────────────

const ZONE_TABLE = [
  { range: '0 – 20',  zone: 'Capitulation',  color: '#3B82F6', desc: 'Price below key on-chain cost bases. Historic buy zones.' },
  { range: '20 – 40', zone: 'Accumulation',  color: '#35D07F', desc: 'Price recovering toward realized price. Smart money accumulates.' },
  { range: '40 – 60', zone: 'Expansion',     color: '#94A3B8', desc: 'Mid-cycle. Price above realized, below transferred × 3.' },
  { range: '60 – 80', zone: 'Elevated',      color: '#E6B450', desc: 'Price approaching transferred price range. Reduce risk.' },
  { range: '80 – 100', zone: 'Distribution', color: '#FF5C5C', desc: 'Price near or above terminal price. Historic cycle tops.' },
];

const ZONE_DESCRIPTIONS = [
  {
    zone: 'Capitulation / Accumulation',
    color: '#3B82F6',
    text: 'Score 0–40. BTC trades below its average realized price and balance price. Historically the safest multi-year entry windows. Every major cycle bottom — 2015, 2018, 2020, 2022 — occurred in this zone.',
  },
  {
    zone: 'Expansion / Elevated',
    color: '#E6B450',
    text: 'Score 40–80. Mid-to-late cycle. Price is above cost bases but below terminal price. Begin scaling positions. Watch CDD spikes as long-term holders start distributing.',
  },
  {
    zone: 'Distribution',
    color: '#FF5C5C',
    text: 'Score 80–100. Price approaches or exceeds terminal price (transferred × 21). Every BTC cycle peak (2013, 2017, 2021) occurred in this zone. Reduce exposure significantly.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CycleMasterPage() {
  // Fetch and compute
  let points: CycleMasterPoint[] = [];
  let fetchError = false;

  try {
    const raw = await fetchCycleMasterData('2010-07-01');
    if (raw.length > 0) {
      points = computeCycleMaster(raw);
    }
  } catch {
    fetchError = true;
  }

  // Downsample to weekly (every 7th point) for chart performance, always keep last
  const weekly: CycleMasterPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i % 7 === 0 || i === points.length - 1) weekly.push(points[i]);
  }

  // CoinMetrics publishes with a 1-day lag — skip today's incomplete row
  const last = points.findLast((p) => p.realized != null) ?? points.at(-1) ?? null;
  const score = last ? scoreCycleMaster(last) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Cycle Master"
        subtitle="On-chain valuation model — MVRV, Realized Price, Transferred Price, Terminal Price"
      />

      {/* ── Cycle zone banner ───────────────────────────────────────────── */}
      {score && last && (
        <div
          className="flex items-center gap-4 rounded-xl border px-5 py-4"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor: score.color,
            borderWidth: 1,
          }}
        >
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: score.color }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-base font-semibold" style={{ color: score.color }}>
                {score.label}
              </p>
              <span
                className="px-2.5 py-0.5 rounded text-xs font-mono border"
                style={{
                  backgroundColor: `${score.color}18`,
                  borderColor: `${score.color}40`,
                  color: score.color,
                }}
              >
                Score {score.score.toFixed(0)} / 100
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
              Based on price position relative to Balance, Realized, Transferred, and Terminal price models.
              {' '}CDD component included where data is available.
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-2xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
              {fmtUSD(last.price)}
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
              Current BTC Price
            </p>
          </div>
        </div>
      )}

      {/* ── 5 stat cards ────────────────────────────────────────────────── */}
      {last && (() => {
        const mvrv = last.realized != null && last.realized > 0
          ? last.price / last.realized
          : null;
        const mvrvSub = mvrv != null
          ? mvrv < 1.0 ? 'Below cost basis — capitulation'
          : mvrv < 2.0 ? 'Accumulation zone'
          : mvrv < 3.5 ? 'Expansion / elevated'
          : 'Distribution risk'
          : 'Not available';
        return (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              label="BTC Price"
              value={fmtUSD(last.price)}
              sub="Current market price"
              accent="#F7931A"
              freshness="daily"
              source="CoinMetrics"
            />
            <StatCard
              label="MVRV Ratio"
              value={mvrv != null ? `${mvrv.toFixed(2)}×` : '—'}
              sub={mvrvSub}
              accent="#A78BFA"
              freshness="daily"
              source="CoinMetrics"
            />
            <StatCard
              label="Transferred Price"
              value={fmtUSD(last.transferred)}
              sub={last.transferred != null ? pctRelToPrice(last.price, last.transferred) : 'Requires CDD data'}
              accent="#EAB84D"
              freshness="daily"
            />
            <StatCard
              label="Realized Price"
              value={fmtUSD(last.realized)}
              sub={last.realized != null ? pctRelToPrice(last.price, last.realized) : 'Not available'}
              accent="#3B82F6"
              freshness="daily"
              source="CoinMetrics"
            />
            <StatCard
              label="Balance Price"
              value={fmtUSD(last.balance)}
              sub={last.balance != null ? pctRelToPrice(last.price, last.balance) : 'Requires CDD data'}
              accent="#35D07F"
              freshness="daily"
            />
          </div>
        );
      })()}

      {/* Error state */}
      {(fetchError || !last) && (
        <div
          className="rounded-xl border px-5 py-8 text-center"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>
            {fetchError
              ? 'Unable to fetch on-chain data. CoinMetrics Community API may be temporarily unavailable.'
              : 'No data available.'}
          </p>
        </div>
      )}

      {/* ── Main chart card ──────────────────────────────────────────────── */}
      {weekly.length > 0 && (() => {
        const mvrv = last?.realized != null && last.realized > 0
          ? last.price / last.realized : null;
        return (
          <CycleMasterChartSection
            data={weekly}
            price={last?.price ?? null}
            realized={last?.realized ?? null}
            transferred={last?.transferred ?? null}
            mvrv={mvrv}
            score={score?.score ?? null}
            scoreLabel={score?.label ?? null}
            scoreColor={score?.color ?? null}
          />
        );
      })()}

      {/* ── MVRV / CDD chart card ────────────────────────────────────────── */}
      {weekly.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              MVRV Ratio · Market Value to Realized Value
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              MVRV below 1.0 = price below average cost basis (cycle bottoms). Above 3.5 = distribution risk.
              {' '}CDD chart shown here when a subscription source is configured.
            </p>
          </div>
          <CDDChart data={weekly} />
        </div>
      )}

      {/* ── Zone threshold table ─────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          Cycle Score — Zone Thresholds
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left pb-2 pr-6">Score Range</th>
                <th className="text-left pb-2 pr-6">Zone</th>
                <th className="text-left pb-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {ZONE_TABLE.map((z) => (
                <tr key={z.zone} style={{ borderTop: '1px solid var(--sct-border)' }}>
                  <td className="py-2 pr-6 font-mono" style={{ color: 'var(--sct-muted)' }}>
                    {z.range}
                  </td>
                  <td className="py-2 pr-6 font-semibold" style={{ color: z.color }}>
                    {z.zone}
                  </td>
                  <td className="py-2" style={{ color: 'var(--sct-muted)' }}>
                    {z.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── How to read — 3-col zone grid ───────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          How to Read This Model
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ZONE_DESCRIPTIONS.map((z) => (
            <div
              key={z.zone}
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: `${z.color}08`,
                borderColor: `${z.color}30`,
              }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: z.color }}>
                {z.zone}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
                {z.text}
              </p>
            </div>
          ))}
        </div>

        {/* Model notes */}
        <div
          className="mt-5 pt-4 border-t text-xs space-y-1.5"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          <p>
            <span style={{ color: 'var(--sct-text)' }}>MVRV Ratio</span>
            {' '}= Market Cap ÷ Realized Cap = Price ÷ Realized Price. Below 1.0 = price below holder cost basis. Historical tops at 3.5–7.0×.
          </p>
          <p>
            <span style={{ color: 'var(--sct-text)' }}>Realized Price</span>
            {' '}= Avg. price at which all BTC last moved on-chain. Derived via MVRV from the CoinMetrics Community API.
          </p>
          <p>
            <span style={{ color: 'var(--sct-text)' }}>Transferred Price</span>
            {' '}= Cumulative CDD ÷ Circulating Supply. Requires Coin Days Destroyed (unavailable on free tier).
          </p>
          <p>
            <span style={{ color: 'var(--sct-text)' }}>Terminal Price</span>
            {' '}= Transferred Price × 21. Requires CDD (unavailable on free tier).
          </p>
          <p>
            <span style={{ color: 'var(--sct-text)' }}>Data source:</span>
            {' '}CoinMetrics Community API (PriceUSD, SplyCur, CapMVRVCur — all free tier) · Revalidated every 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
