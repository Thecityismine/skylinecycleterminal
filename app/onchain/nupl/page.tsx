import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { computeNUPL, nuplSignal } from '@/lib/indicators/nupl';
import { NUPLChartSection } from '@/components/charts/NUPLChartSection';
import { PageHeader }        from '@/components/dashboard/PageHeader';
import { StatCard }          from '@/components/dashboard/StatCard';

export const dynamic = 'force-dynamic';

function fmtUSD(v: number | null | undefined): string {
  if (v == null) return 'â€”';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmt3(v: number | null | undefined): string {
  if (v == null) return 'â€”';
  return v.toFixed(3);
}

export default async function NUPLPage() {
  const result = await (async () => {
    try {
      const raw = await fetchBTCDailyPrice('2011-01-01');
      return computeNUPL(raw);
    } catch {
      return { points: [], current: { nupl: null, price: null, ma730: null }, available: false };
    }
  })();

  const { points, current } = result;
  const signal = nuplSignal(current.nupl);

  const ma730BelowPrice = current.ma730 != null && current.price != null && current.price < current.ma730;
  const ma730Color = current.ma730 != null && current.price != null
    ? (ma730BelowPrice ? '#3B82F6' : '#35D07F')
    : '#94A3B8';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin NUPL"
        subtitle="Net Unrealized Profit/Loss â€” 5-zone sentiment model using 730-day MA as cost basis proxy"
      />

      {/* â”€â”€ Regime banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="flex items-center gap-4 rounded-xl border px-5 py-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: signal.color, borderWidth: 1 }}
      >
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: signal.color }} />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-base font-semibold" style={{ color: signal.color }}>{signal.zone}</p>
            <span
              className="px-2.5 py-0.5 rounded text-xs font-mono border"
              style={{
                backgroundColor: `${signal.color}18`,
                borderColor: `${signal.color}40`,
                color: signal.color,
              }}
            >
              NUPL {current.nupl != null ? current.nupl.toFixed(3) : 'â€”'}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>{signal.label}</p>
        </div>
        {current.price != null && (
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-2xl font-mono font-bold" style={{ color: '#F7931A' }}>
              {fmtUSD(current.price)}
            </p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              BTC Price
            </p>
          </div>
        )}
      </div>

      {/* â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="BTC Price"
          value={fmtUSD(current.price)}
          sub="Latest daily close"
          accent="#F7931A"
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="NUPL"
          value={fmt3(current.nupl)}
          sub={signal.zone}
          accent={signal.color}
          freshness="daily"
        />
        <StatCard
          label="Market Zone"
          value={signal.zone}
          sub={signal.label}
          accent={signal.color}
          freshness="daily"
        />
        <StatCard
          label="2Y MA (Cost Basis Proxy)"
          value={fmtUSD(current.ma730)}
          sub={current.ma730 != null && current.price != null
            ? (ma730BelowPrice ? 'Price below 2Y MA â€” accumulate zone' : 'Price above 2Y MA â€” bull territory')
            : '730-day moving average'}
          accent={ma730Color}
          freshness="daily"
        />
      </div>

      {/* â”€â”€ Data source note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="flex items-start gap-3 rounded-lg border px-4 py-3 text-xs"
        style={{ backgroundColor: `#A855F710`, borderColor: `#A855F740`, color: 'var(--sct-muted)' }}
      >
        <span className="mt-0.5 shrink-0" style={{ color: '#A855F7' }}>â“˜</span>
        <p>
          <span style={{ color: '#A855F7' }}>Data source note: </span>
          True NUPL (Net Unrealized Profit/Loss) requires UTXO-level realized price data.
          This page approximates realized price using the <strong style={{ color: 'var(--sct-text)' }}>730-day moving average</strong> as
          a cost-basis proxy. NUPL = (Market Cap âˆ’ Realized Cap) / Market Cap. Positive values indicate
          the market is in aggregate profit; negative values indicate aggregate loss.
        </p>
      </div>

      {/* â”€â”€ Main chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {points.length > 0 ? (
        <NUPLChartSection
          points={points}
          nupl={current.nupl}
          price={current.price}
          ma730={current.ma730}
          zoneLabel={signal.label}
          zoneColor={signal.color}
          zone={signal.zone}
        />
      ) : (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm text-center py-16" style={{ color: 'var(--sct-muted)' }}>
            Unable to load price data.
          </p>
        </div>
      )}

      {/* â”€â”€ Zone reference â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          NUPL Zone Reference
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs leading-relaxed">
          {[
            {
              zone: 'Capitulation', range: 'NUPL < 0', color: '#3B82F6',
              desc: 'Market in aggregate loss. Nearly all holders are underwater â€” historically the strongest long-term accumulation zone.',
              ctx: 'Has marked every major cycle bottom in BTC history.',
            },
            {
              zone: 'Hope', range: '0 â€“ 0.35', color: '#35D07F',
              desc: 'Market moves from loss to modest profit. Early recovery phase. Long-term holders who accumulated are starting to profit.',
              ctx: 'The bulk of a bull run\'s time is spent in this zone.',
            },
            {
              zone: 'Optimism', range: '0.35 â€“ 0.60', color: '#A3E635',
              desc: 'Most holders in significant profit. Retail interest picking up. Bull market confirmation territory.',
              ctx: 'Begin trimming positions in tranches through this zone.',
            },
            {
              zone: 'Belief', range: '0.60 â€“ 0.75', color: '#E6B450',
              desc: 'Almost all holders in substantial profit. Euphoria building. Distribution by long-term holders accelerates.',
              ctx: 'High caution â€” cycles have topped in this zone before.',
            },
            {
              zone: 'Euphoria', range: 'NUPL > 0.75', color: '#FF5C5C',
              desc: 'Extreme unrealized profit. Every prior instance preceded a major bear market. Statistically, mean reversion is near certain.',
              ctx: 'Historical top signal â€” reduce exposure significantly.',
            },
          ].map((z) => (
            <div key={z.zone}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: z.color }} />
                <p className="font-semibold" style={{ color: z.color }}>{z.zone}</p>
                <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--sct-muted)' }}>{z.range}</span>
              </div>
              <p style={{ color: 'var(--sct-muted)' }}>{z.desc}</p>
              <p
                className="mt-2 text-[11px] px-2 py-1 rounded"
                style={{ backgroundColor: z.color + '12', color: z.color }}
              >
                {z.ctx}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* â”€â”€ Interpretation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--sct-text)' }}>
          How to Read NUPL
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--sct-text)' }}>The formula</p>
            <p>
              NUPL = (Market Cap âˆ’ Realized Cap) / Market Cap. When positive, the market is sitting on
              net unrealized gains. When negative, the market is sitting on net unrealized losses.
              The magnitude shows how extreme the aggregate position is.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--sct-text)' }}>The proxy approach</p>
            <p>
              True realized price requires tracking the cost basis of every UTXO â€” data not available
              through free public APIs. The 730-day (2-year) MA is used as a directional proxy: it
              approximates the average entry price across the holder base at cycle timescales.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--sct-text)' }}>What it signals</p>
            <p>
              Transitions between zones â€” especially from Capitulation to Hope and from Belief to
              Euphoria â€” are the most actionable signals. A sustained hold in Capitulation followed
              by a break above 0 has historically confirmed every major cycle bottom.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--sct-text)' }}>Limitations</p>
            <p>
              NUPL does not call the exact top or bottom. Long-term holders can keep the market in
              Belief/Euphoria for months. Use in conjunction with Puell Multiple, MVRV, and Hash Ribbon
              for a higher-conviction multi-signal read.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
