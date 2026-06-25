import { fetchBTCDailyPrice }  from '@/lib/api/coinmetrics';
import { buildPowerLawData, computeStats } from '@/lib/indicators/powerLaw';
import { PowerLawPageClient }  from '@/components/charts/PowerLawPageClient';
import { PageHeader }          from '@/components/dashboard/PageHeader';
import { StatCard }            from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export const dynamic = 'force-dynamic';

function fmtUSD(v: number | null): string {
  if (v == null) return 'â€”';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtYrs(v: number): string {
  if (Math.abs(v) < 0.1) return '< 0.1y';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}y`;
}

const ZONE_META = {
  above_ceil:  { label: 'Above Ceiling â€” Extreme Overvaluation', color: '#F472B6',
    desc: 'Price has broken above the historical ceiling band. Every prior occurrence marked a major cycle top within months.' },
  above_fair:  { label: 'Above Fair Value â€” Elevated', color: '#F97316',
    desc: 'Price is above the power law median. Historically the second half of bull markets. Risk/reward deteriorating â€” reduce exposure on strength.' },
  below_fair:  { label: 'Below Fair Value â€” Accumulation Zone', color: '#38BDF8',
    desc: 'Price is below the model median but above the floor. This zone often represents mid-cycle consolidation and strong accumulation opportunities.' },
  below_floor: { label: 'Below Floor â€” Deep Value / Bear Market', color: '#818CF8',
    desc: 'Price has fallen below the historical floor. Every prior occurrence marked a bear market bottom. Historically the strongest long-term buy signal.' },
};

export default async function PowerLawPage() {
  let data:   Awaited<ReturnType<typeof buildPowerLawData>> = [];
  let stats:  ReturnType<typeof computeStats> | null = null;
  let fetchError = false;

  try {
    const prices = await fetchBTCDailyPrice('2010-01-01');
    data  = buildPowerLawData(prices, 2);
    const last = prices.at(-1);
    if (last) {
      const nowMs = new Date(last.time + 'T00:00:00Z').getTime();
      stats = computeStats(last.price, nowMs);
    }
  } catch {
    fetchError = true;
  }

  const zone = stats ? ZONE_META[stats.zone] : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Power Law"
        subtitle="Price follows a power law relationship with time â€” logâ‚â‚€(P) = 5.82 Ã— logâ‚â‚€(days) âˆ’ 16.73"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="BTC Price"
          value={fmtUSD(stats?.price ?? null)}
          sub="Latest close"
          accent="var(--sct-text)"
          freshness="daily"
        />
        <StatCard
          label="Fair Value"
          value={fmtUSD(stats?.fair ?? null)}
          sub={stats ? fmtPct(stats.pctVsFair) + ' vs fair' : 'â€”'}
          accent="#38BDF8"
        />
        <StatCard
          label="Floor"
          value={fmtUSD(stats?.floor ?? null)}
          sub={stats ? `Lead: ${fmtYrs(stats.leadFloor)}` : 'â€”'}
          accent="#818CF8"
        />
        <StatCard
          label="Ceiling"
          value={fmtUSD(stats?.ceil ?? null)}
          sub={stats ? `Lead: ${fmtYrs(stats.leadCeil)}` : 'â€”'}
          accent="#F472B6"
        />
      </div>

      {/* Zone badge */}
      {zone && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: zone.color }}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: zone.color }}>{zone.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{zone.desc}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {fetchError ? (
        <div
          className="h-[480px] flex items-center justify-center rounded-xl border text-sm"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          Unable to load data â€” CoinMetrics API unreachable
        </div>
      ) : (
        <PowerLawPageClient
          data={data}
          price={stats?.price ?? null}
          fair={stats?.fair ?? null}
          floor={stats?.floor ?? null}
          ceil={stats?.ceil ?? null}
          pctVsFair={stats?.pctVsFair ?? null}
          leadFloor={stats?.leadFloor ?? null}
          leadCeil={stats?.leadCeil ?? null}
          zoneLabel={zone?.label ?? null}
          zoneColor={zone?.color ?? null}
        />
      )}

      {/* Insight panel */}
      <InsightPanel title="Model Overview">
        <InsightRow
          label="Power Law Formula"
          value="logâ‚â‚€(P) = 5.82 Ã— logâ‚â‚€(D) âˆ’ 16.73, where D = days since genesis block (2009-01-03). On a log-log chart, price forms a straight line â€” suggesting BTC's growth is deterministic, not random."
          stack
        />
        <InsightRow
          label="Fair Value (Median)"
          value="The central regression line. Price oscillates above and below this level through market cycles. BTC has never closed a calendar year below the fair value line."
          valueColor="#38BDF8"
          stack
        />
        <InsightRow
          label="Floor (Ã—0.42)"
          value="Historical lower bound â€” fair value Ã— 0.42. Bear market bottoms (2015, 2018, 2022) tested but rarely breached this level. The strongest historical buy signals occur here."
          valueColor="#818CF8"
          stack
        />
        <InsightRow
          label="Ceiling (Ã—4.27)"
          value="Historical upper bound â€” fair value Ã— 4.27. Each bull market cycle top has approached or briefly exceeded this level before reversing."
          valueColor="#F472B6"
          stack
        />
        <InsightRow
          label="Lead vs Floor / Ceiling"
          value="Years until the floor or ceiling reaches the current BTC price. A positive floor lead means BTC is above where the floor will be â€” tracking how much support is building beneath."
          stack
        />
        <InsightRow
          label="Source"
          value="Model: Giovanni Santostasi / MCO Legacy Power Law Â· Price data: CoinMetrics Community API"
          stack
        />
      </InsightPanel>
    </div>
  );
}
