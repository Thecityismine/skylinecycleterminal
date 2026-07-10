import { fetchDailyPrice } from '@/lib/api/coinmetrics';
import {
  buildCapitalAgeSeries,
  toHodlWaveChartData,
  toVintageChartData,
  getVintageYears,
  getAgePyramid,
  getDormancyClock,
  getCapitalAgingScore,
  getSthRegime,
  getHolderTrendRegime,
  fmtPct,
  fmtPp,
} from '@/lib/indicators/capitalAgeStructure';
import { CapitalAgeTabs } from '@/components/onchain/CapitalAgeTabs';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';

export const revalidate = 86400;

export default async function CapitalAgeStructurePage() {
  const prices = await (async () => {
    try {
      return await fetchDailyPrice('btc', '2010-07-17');
    } catch {
      return [];
    }
  })();

  const series = buildCapitalAgeSeries(prices);
  const last = series.length > 0 ? series[series.length - 1] : null;
  const prior90d = series.length > 13 ? series[series.length - 1 - 13] : null;

  const hodlWaveData = toHodlWaveChartData(series);
  const vintageYears = getVintageYears(series);
  const vintageData = toVintageChartData(series, vintageYears);
  const agePyramidRows = getAgePyramid(series);
  const dormancy = getDormancyClock(series);
  const capitalAgingScore = getCapitalAgingScore(series);

  const sthPct = last?.sthRealizedCapPct ?? null;
  const lthPct = last?.lthRealizedCapPct ?? null;
  const sthChange90d = last && prior90d ? last.sthRealizedCapPct - prior90d.sthRealizedCapPct : null;
  const lthChange90d = last && prior90d ? last.lthRealizedCapPct - prior90d.lthRealizedCapPct : null;

  const sthRegime = sthPct != null ? getSthRegime(sthPct) : null;
  const holderTrendRegime = sthChange90d != null && lthChange90d != null
    ? getHolderTrendRegime(sthChange90d, lthChange90d)
    : null;

  const pageRegime = capitalAgingScore
    ? capitalAgingScore.score < 25 ? 'distribution'
    : capitalAgingScore.score < 50 ? 'caution'
    : capitalAgingScore.score < 75 ? 'hold'
    : 'accumulate'
    : 'neutral';

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="BTC Capital Age Structure"
        subtitle="Realized-cap HODL waves, holder conviction, and capital rotation across the Bitcoin network"
        regime={pageRegime}
      />

      {/* ── Methodology disclosure ─────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{ backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }}
      >
        <span className="text-blue-400 text-base shrink-0">ⓘ</span>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(147,197,253,0.9)' }}>
          <strong>Methodology:</strong> True UTXO age-cohort and realized-cap-by-age data requires a paid
          on-chain provider (e.g. Glassnode Advanced, CryptoQuant Professional, IntoTheBlock) that this
          dashboard is not currently connected to — CoinMetrics&apos; free tier returns <code>403</code> on
          <code>SplyAct1yr/2yr/3yr</code> and <code>CapRealUSD</code>. This page instead runs a coin-age
          simulation seeded with two real inputs — Bitcoin&apos;s actual daily price history and its known
          halving-based issuance schedule — and a modeled weekly &quot;respend probability&quot; that rises
          when price runs hot above its 2-year trend and falls in quiet markets. Coins that respend re-enter
          at age zero carrying that week&apos;s price as their new cost basis; coins that don&apos;t move keep
          aging and keep their old cost basis, so realized cap (quantity × cost basis) diverges from raw
          supply share exactly the way the real metric does. Treat every chart on this page as illustrative
          of the framework, not a live data feed, until a real on-chain provider is connected.
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Short-Term Holder Realized Cap"
          value={fmtPct(sthPct)}
          sub={sthRegime?.label ?? ''}
          accent="#F7931A"
          freshness="daily"
        />
        <StatCard
          label="Long-Term Holder Realized Cap"
          value={fmtPct(lthPct)}
          sub="Coins last moved 6M+ ago"
          accent="#3B82F6"
          freshness="daily"
        />
        <StatCard
          label="Cycle Regime"
          value={holderTrendRegime?.label ?? '—'}
          sub={`90D STH ${fmtPp(sthChange90d)} · LTH ${fmtPp(lthChange90d)}`}
          accent={holderTrendRegime?.color ?? 'var(--sct-muted)'}
          freshness="daily"
        />
        <StatCard
          label="Dormancy Clock"
          value={dormancy ? `${dormancy.years.toFixed(2)}y` : '—'}
          sub={dormancy ? `${dormancy.regime} · 90D ${dormancy.trend90d >= 0 ? '+' : ''}${dormancy.trend90d.toFixed(2)}y` : ''}
          accent={dormancy?.regime === 'Rising' ? '#35D07F' : dormancy?.regime === 'Falling' ? '#FF5C5C' : 'var(--sct-muted)'}
          freshness="daily"
        />
      </div>

      {/* ── Tabs + charts ─────────────────────────────────────────────────── */}
      {series.length === 0 || !dormancy || !capitalAgingScore ? (
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>No data available</p>
        </div>
      ) : (
        <CapitalAgeTabs
          hodlWaveData={hodlWaveData}
          vintageData={vintageData}
          vintageYears={vintageYears}
          agePyramidRows={agePyramidRows}
          dormancy={dormancy}
          capitalAgingScore={capitalAgingScore}
        />
      )}

      {/* ── Capital Aging Score breakdown ───────────────────────────────────── */}
      {capitalAgingScore && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Capital Aging Score
          </p>

          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-5xl font-mono font-bold" style={{ color: capitalAgingScore.color }}>
              {capitalAgingScore.score}
            </span>
            <span className="text-sm font-medium" style={{ color: capitalAgingScore.color }}>{capitalAgingScore.label}</span>
          </div>

          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--sct-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${capitalAgingScore.score}%`, backgroundColor: capitalAgingScore.color }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono mb-5" style={{ color: 'var(--sct-muted)' }}>
            <span style={{ color: '#FF5C5C' }}>0 — High Speculation</span>
            <span style={{ color: '#E6B450' }}>25</span>
            <span style={{ color: '#35D07F' }}>50</span>
            <span style={{ color: '#3B82F6' }}>75 — Deep Conviction</span>
            <span>100</span>
          </div>

          <div className="space-y-2">
            {capitalAgingScore.breakdown.map((c) => {
              const color = c.value < 25 ? '#FF5C5C' : c.value < 50 ? '#E6B450' : c.value < 75 ? '#35D07F' : '#3B82F6';
              return (
                <div key={c.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>{c.label}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color }}>{Math.round(c.value)}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${c.value}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Interpretation panel ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'STH Share Falling + LTH Rising',
            color: '#3B82F6',
            content: 'Accumulation / holder conviction strengthening. Capital is aging and supply is becoming more patient — historically a quieter, lower-speculation environment.',
          },
          {
            label: 'STH Share Rising + LTH Falling',
            color: '#FF5C5C',
            content: 'Distribution / speculation increasing. Older capital is on the move and being revalued at recent prices — historically associated with elevated late-cycle risk.',
          },
          {
            label: 'Realized Cap vs. Supply Share',
            color: '#35D07F',
            content: 'A cohort with realized-cap share above its supply share paid a premium relative to how much of the network it holds — recently transacted, high cost-basis coins. The reverse marks old, low cost-basis supply.',
          },
          {
            label: 'Interpretation Caveats',
            color: '#6B7280',
            content: 'This page runs a modeled simulation, not a live on-chain feed. Treat every number as directionally illustrative of the framework, not a precise measurement, until a real provider is connected.',
          },
        ].map((p) => (
          <div key={p.label} className="rounded-xl border p-4" style={{ backgroundColor: `${p.color}08`, borderColor: `${p.color}25` }}>
            <p className="text-xs font-semibold mb-2" style={{ color: p.color }}>{p.label}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{p.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
