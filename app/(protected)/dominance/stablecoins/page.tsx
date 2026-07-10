import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { fetchStablecoinHistory } from '@/lib/api/defillama';
import { fetchMarketData } from '@/lib/api/coingecko';
import { buildStablecoinDominancePoints } from '@/lib/indicators/stablecoinDominance';
import { StablecoinDominanceChartSection } from '@/components/charts/StablecoinDominanceChartSection';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export const dynamic = 'force-dynamic';

function fmtPct(v: number | null, decimals = 2): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`;
}

function fmtBig(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  return `$${v.toFixed(0)}`;
}

export default async function StablecoinDominancePage() {
  let result: Awaited<ReturnType<typeof buildStablecoinDominancePoints>> | null = null;

  try {
    const [stableHistory, btcPrices, marketData] = await Promise.all([
      fetchStablecoinHistory(),
      fetchBTCDailyPrice('2019-01-01'),
      fetchMarketData(),
    ]);

    if (stableHistory.length > 0 && btcPrices.length > 0 && marketData) {
      result = buildStablecoinDominancePoints(
        stableHistory,
        btcPrices,
        marketData.totalMarketCapUSD,
        marketData.btcDominance,
      );
    }
  } catch {
    // handled below
  }

  const cur     = result?.current;
  const regime  = result?.regime;
  const score   = result?.liquidityScore ?? 0;

  const scoreColor =
    score >= 65 ? 'var(--sct-green)' :
    score >= 45 ? '#F2B84B' :
    'var(--sct-red)';

  const dom30dColor =
    cur?.dom30dChange != null
      ? cur.dom30dChange < -0.3 ? 'var(--sct-green)' :
        cur.dom30dChange >  0.3 ? 'var(--sct-red)'  :
        '#F2B84B'
      : 'var(--sct-muted)';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Stablecoin Dominance"
        subtitle="Stablecoin share of total crypto market cap — rising dominance signals defensive capital rotation; falling signals risk appetite returning"
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Stablecoin Dominance"
          value={cur?.dominance != null ? `${cur.dominance.toFixed(2)}%` : '—'}
          sub={cur?.ma30 != null ? `30D MA: ${cur.ma30.toFixed(2)}%` : 'of total crypto market cap'}
          accent="#4DA3FF"
          freshness="daily"
          source="DefiLlama"
        />
        <StatCard
          label="30D Dom. Change"
          value={cur?.dom30dChange != null
            ? `${cur.dom30dChange >= 0 ? '+' : ''}${cur.dom30dChange.toFixed(2)} pts`
            : '—'}
          sub={cur?.dom30dChange != null
            ? cur.dom30dChange < 0
              ? 'Dominance declining'
              : 'Dominance rising'
            : '30-day momentum'}
          accent={dom30dColor}
          freshness="daily"
        />
        <StatCard
          label="Stablecoin Supply"
          value={fmtBig(cur?.stablecoinMC ?? null)}
          sub={cur?.supply30dChange != null
            ? `${fmtPct(cur.supply30dChange)} 30D supply change`
            : 'Total stablecoin market cap'}
          accent="var(--sct-secondary)"
          freshness="daily"
          source="DefiLlama"
        />
        <StatCard
          label="Liquidity Score"
          value={result ? `${score} / 100` : '—'}
          sub={regime?.label ?? 'Capital flow signal'}
          accent={scoreColor}
          freshness="daily"
        />
      </div>

      {/* Regime banner */}
      {regime && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: regime.color }}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: regime.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: regime.color }}>{regime.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{regime.description}</p>
          </div>
          {result && (
            <div
              className="ml-auto flex flex-col items-end shrink-0"
              title="Liquidity Score: composite of dominance trend and supply growth"
            >
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Liquidity Score</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 w-24 rounded-full" style={{ backgroundColor: '#21262D' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${score}%`, backgroundColor: scoreColor }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: scoreColor }}>{score}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main chart */}
      {result && result.points.length > 0 ? (
        <StablecoinDominanceChartSection
          points={result.points}
          dominance={cur?.dominance ?? null}
          ma30={cur?.ma30 ?? null}
          ma90={cur?.ma90 ?? null}
          stablecoinMC={cur?.stablecoinMC ?? null}
          btcPrice={cur?.btcPrice ?? null}
          dom30dChange={cur?.dom30dChange ?? null}
          supply30dChange={cur?.supply30dChange ?? null}
          regimeLabel={regime?.label ?? ''}
          regimeColor={regime?.color ?? '#8B949E'}
          liquidityScore={score}
        />
      ) : (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm text-center py-16" style={{ color: 'var(--sct-muted)' }}>
            Unable to load stablecoin data. Check DefiLlama API availability.
          </p>
        </div>
      )}

      {/* Zone reference table */}
      <div
        className="rounded-xl border p-5 grid grid-cols-1 sm:grid-cols-3 gap-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {[
          {
            range: '< 6%',
            label: 'Risk-On',
            color: '#35D07F',
            desc: 'Very low stablecoin share. Capital is deployed in crypto. Historically bull-market territory — late-stage rallies often coincide with extremely low stablecoin dominance.',
          },
          {
            range: '6% – 12%',
            label: 'Neutral',
            color: '#F2B84B',
            desc: 'Stablecoin dominance in the middle range. No clear directional signal. Monitor the 30D trend direction rather than the absolute level.',
          },
          {
            range: '> 12%',
            label: 'Risk-Off',
            color: '#FF5C5C',
            desc: 'Elevated stablecoin share signals defensive capital rotation. Peaks above 14–18% have historically marked major bear market troughs or extreme fear events.',
          },
        ].map((zone) => (
          <div key={zone.range} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
              <span className="text-xs font-semibold font-mono" style={{ color: zone.color }}>{zone.range}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--sct-secondary)' }}>{zone.label}</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{zone.desc}</p>
          </div>
        ))}
      </div>

      {/* Insight panel */}
      <InsightPanel title="Indicator Logic">
        <InsightRow
          label="What it measures"
          value="The share of total crypto market capitalization held in USD-pegged stablecoins (USDT, USDC, DAI, and others). When this percentage rises, capital is rotating defensively into stable assets. When it falls, capital is redeploying into volatile crypto assets — a constructive liquidity signal."
          stack
        />
        <InsightRow
          label="Regime interpretation"
          value="Rising dominance during a bear market can mean two things: (1) fear-driven capital flight into stables, or (2) organic stablecoin supply growth. Context matters — check whether BTC price is also falling. Rising dominance while BTC rallies is historically a negative divergence. Falling dominance while BTC rallies is the cleanest risk-on signal."
          stack
        />
        <InsightRow
          label="Liquidity Score"
          value="A composite 0–100 score weighting: 30D dominance change (40%), 90D dominance change (30%), and 30D stablecoin supply growth (30%). Score > 65 = favorable liquidity conditions. Score < 45 = deteriorating. This is a directional tool, not a precision signal."
          stack
        />
        <InsightRow
          label="Methodology note"
          value="Total market cap approximation: dominance is calibrated so the current data point matches the actual total market cap from CoinGecko. Historical values use BTC price as a proxy for total market cap fluctuations. This introduces some approximation error but preserves the correct directional trend."
          stack
        />
        <InsightRow
          label="Source"
          value="Stablecoin supply: DefiLlama stablecoincharts/all API (free tier, all-time daily) · Total market cap: CoinGecko Global API · BTC price: CoinMetrics Community API · Revalidated every 24 hours"
          stack
        />
      </InsightPanel>
    </div>
  );
}
