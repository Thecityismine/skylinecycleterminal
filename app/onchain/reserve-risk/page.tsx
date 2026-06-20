import { fetchBTCRealizedPrice } from '@/lib/api/coinmetrics';
import { computeNUPL, nuplSignal } from '@/lib/indicators/nupl';
import { NUPLChart } from '@/components/charts/NUPLChart';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export const revalidate = 86400;

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

export default async function NUPLPage() {
  let result: Awaited<ReturnType<typeof computeNUPL>> | null = null;

  try {
    const raw = await fetchBTCRealizedPrice('2012-01-01');
    result = computeNUPL(raw);
  } catch {
    // handled below
  }

  const cur = result?.current;
  const sig = nuplSignal(cur?.nupl ?? null);

  // Trend: compare last NUPL to 30-day prior
  let trend = 'Neutral';
  let trendColor = 'var(--sct-muted)';
  if (result?.points) {
    const pts = result.points.filter((p) => p.nupl != null);
    const last30 = pts.slice(-30).map((p) => p.nupl!);
    const ma30 = last30.length > 0 ? last30.reduce((s, v) => s + v, 0) / last30.length : null;
    if (cur?.nupl != null && ma30 != null) {
      if (cur.nupl < ma30 - 0.02) { trend = 'Improving'; trendColor = 'var(--sct-green)'; }
      else if (cur.nupl > ma30 + 0.02) { trend = 'Deteriorating'; trendColor = 'var(--sct-red)'; }
    }
  }

  // Realized price (for stat card)
  const latestWithRealized = result?.points
    ? [...result.points].reverse().find((p) => p.nupl != null)
    : null;
  const realizedPrice = latestWithRealized && cur?.price && cur.nupl != null
    ? cur.price * (1 - cur.nupl)
    : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="NUPL — Net Unrealized Profit / Loss"
        subtitle="Market-wide unrealized profit and loss as a fraction of market cap — a macro sentiment indicator"
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="NUPL"
          value={cur?.nupl != null ? cur.nupl.toFixed(3) : '—'}
          sub={sig.zone}
          accent={sig.color}
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="Signal"
          value={sig.zone !== 'Unknown' ? sig.zone : '—'}
          sub={cur?.nupl != null
            ? cur.nupl < 0 ? 'Market in unrealized loss'
            : `${(cur.nupl * 100).toFixed(1)}% of market cap is profit`
            : 'Loading…'}
          accent={sig.color}
          freshness="daily"
        />
        <StatCard
          label="Realized Price"
          value={realizedPrice != null ? fmtUSD(realizedPrice) : '—'}
          sub="Average on-chain cost basis"
          accent="var(--sct-secondary)"
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="Trend"
          value={trend}
          sub="vs. 30-day NUPL average"
          accent={trendColor}
          freshness="daily"
        />
      </div>

      {/* Signal badge */}
      {result?.available && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: sig.color }}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sig.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: sig.color }}>{sig.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              NUPL is a slow-moving macro backdrop. Confirm with MVRV and Puell Multiple before acting.
            </p>
          </div>
        </div>
      )}

      {/* Main chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              BTC Price (log) · NUPL
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Dashed verticals = Bitcoin halvings · Zones: Capitulation → Hope → Optimism → Belief → Euphoria
            </p>
          </div>
          {/* Zone legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--sct-muted)' }}>
            {[
              { label: 'Capitulation',  color: '#3B82F6' },
              { label: 'Hope',          color: '#35D07F' },
              { label: 'Optimism',      color: '#A3E635' },
              { label: 'Belief',        color: '#E6B450' },
              { label: 'Euphoria',      color: '#FF5C5C' },
            ].map((z) => (
              <span key={z.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                {z.label}
              </span>
            ))}
          </div>
        </div>

        {!result?.available ? (
          <div
            className="h-[380px] flex flex-col items-center justify-center rounded-lg border gap-3 text-center px-8"
            style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
          >
            <p className="text-sm">Loading NUPL data…</p>
            <p className="text-xs">Requires CapRealUSD from CoinMetrics Community tier.</p>
          </div>
        ) : (
          <NUPLChart data={result.points} />
        )}
      </div>

      {/* Insight panel */}
      <InsightPanel title="Indicator Logic">
        <InsightRow
          label="What it measures"
          value="Net Unrealized Profit/Loss (NUPL) = (Market Cap − Realized Cap) / Market Cap. It shows what fraction of all Bitcoin's market cap represents unrealized profit. Negative values mean the average holder is at a loss."
          stack
        />
        <InsightRow
          label="Capitulation Zone (NUPL < 0)"
          value="The market is in aggregate unrealized loss. Historically the best long-term accumulation windows occur here — late 2011, early 2015, late 2018, mid-2022."
          valueColor="#3B82F6"
          stack
        />
        <InsightRow
          label="Euphoria Zone (NUPL > 0.75)"
          value="Over 75% of Bitcoin's market cap is unrealized profit. Every major cycle top (2013, 2017, 2021) occurred at or above this threshold. Begin de-risking aggressively."
          valueColor="#FF5C5C"
          stack
        />
        <InsightRow
          label="How Skyline uses it"
          value="Macro confirmation only. NUPL identifies broad market regime. Cross-reference with MVRV Z-Score and the Skyline Cycle Score before acting on a signal."
          stack
        />
        <InsightRow
          label="Source"
          value="Computed from CoinMetrics Community API · PriceUSD × SplyCur (Market Cap) and CapRealUSD (Realized Cap) · NUPL = 1 − Realized Price / Market Price"
          stack
        />
      </InsightPanel>
    </div>
  );
}
