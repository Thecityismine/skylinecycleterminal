"use client";

import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { BTCMiniChart } from '@/components/charts/BTCMiniChart';
import type { CycleScoreResult, ScoreZone } from '@/lib/indicators/skylineScore';

type MarketSnapshot = {
  btcPrice: number;
  btcChange24h: number;
  btcMarketCap: number;
  ethPrice: number;
  ethChange24h: number;
  btcDominance: number;
  totalMarketCap: number;
  fearGreedValue: number;
  fearGreedLabel: string;
};

type MacroData = { macroScore: number };
type PriceHistory = { prices: Array<{ time: string; price: number }> };

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtChange(n: number): string {
  return `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%`;
}

const ZONE_REGIME: Record<ScoreZone, 'accumulate' | 'hold' | 'caution' | 'distribution'> = {
  accumulate:   'accumulate',
  build:        'hold',
  caution:      'caution',
  distribution: 'distribution',
};

function marketRead(cycle: CycleScoreResult | null, market: MarketSnapshot | null): string {
  if (!cycle || !market) return 'Loading market context…';
  const { zone, score, indicators } = cycle;
  const fg = indicators.find((i) => i.name === 'Fear & Greed');
  const mvrv = indicators.find((i) => i.name === 'MVRV Ratio');

  if (zone === 'accumulate')
    return `Score ${score}/100 — deep value territory. ${mvrv ? `MVRV at ${mvrv.rawLabel}` : ''} suggests the market is trading below realized value. Historically the strongest long-term entry zone.`;
  if (zone === 'build')
    return `Score ${score}/100 — healthy expansion. Market is between key thresholds. ${fg ? `Fear & Greed at ${fg.rawValue}.` : ''} Build positions on pullbacks to key MAs.`;
  if (zone === 'caution')
    return `Score ${score}/100 — elevated cycle risk. Begin reducing exposure in tranches. Watch Pi Cycle and MVRV for further deterioration.`;
  return `Score ${score}/100 — extreme cycle risk. ${fg ? `Sentiment at ${fg.rawValue} (${fg.rawLabel}).` : ''} Historically aligned with cycle top conditions. Protect gains.`;
}

export default function OverviewPage() {
  const { data: market, loading: mktLoading } = useApiData<MarketSnapshot>('/api/market');
  const { data: cycle,  loading: cycLoading  } = useApiData<CycleScoreResult>('/api/cycle');
  const { data: macro  }                        = useApiData<MacroData>('/api/macro');
  const { data: priceHistory }                  = useApiData<PriceHistory>('/api/price');

  const loading = mktLoading || cycLoading;
  const regime = cycle ? ZONE_REGIME[cycle.zone] : 'neutral';

  // Derived sub-scores — average only available indicators in each group
  const onChainGroup = ['MVRV Ratio', 'Puell Multiple', 'NVT Signal', 'Active Addresses', 'Stablecoin Supply', 'Hash Rate Ribbon'];
  const onChainInds  = cycle?.indicators.filter((i) => onChainGroup.includes(i.name) && i.available) ?? [];
  const onChainScore = onChainInds.length > 0
    ? Math.round(onChainInds.reduce((s, i) => s + i.score, 0) / onChainInds.length)
    : null;

  const priceTrendGroup = ['Pi Cycle Top', '2Y MA Multiplier', 'Log Regression'];
  const priceTrendInds  = cycle?.indicators.filter((i) => priceTrendGroup.includes(i.name) && i.available) ?? [];
  const priceTrendScore = priceTrendInds.length > 0
    ? Math.round(priceTrendInds.reduce((s, i) => s + i.score, 0) / priceTrendInds.length)
    : null;

  const sentimentScore = cycle?.indicators.find((i) => i.name === 'Fear & Greed')?.score ?? null;

  function subScoreColor(s: number | null): string {
    if (s == null) return 'var(--sct-muted)';
    if (s < 25) return '#3B82F6';
    if (s < 50) return '#35D07F';
    if (s < 75) return '#E6B450';
    return '#FF5C5C';
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Overview"
        subtitle="Bitcoin & Ethereum macro cycle dashboard"
        regime={regime}
      />

      {/* Row 1 — Key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          label="Bitcoin"
          value={market ? fmtUSD(market.btcPrice) : '$—'}
          sub={market ? fmtChange(market.btcChange24h) : 'Loading…'}
          trend={market ? (market.btcChange24h >= 0 ? 'up' : 'down') : undefined}
          accent="var(--sct-btc)"
          freshness={market ? 'live' : 'cached'}
          source="CoinGecko"
        />
        <StatCard
          label="Ethereum"
          value={market ? fmtUSD(market.ethPrice) : '$—'}
          sub={market ? fmtChange(market.ethChange24h) : 'Loading…'}
          trend={market ? (market.ethChange24h >= 0 ? 'up' : 'down') : undefined}
          accent="var(--sct-eth)"
          freshness={market ? 'live' : 'cached'}
          source="CoinGecko"
        />
        <StatCard
          label="Fear & Greed"
          value={market ? String(market.fearGreedValue) : '—'}
          sub={market ? market.fearGreedLabel : 'Loading…'}
          accent={
            market
              ? market.fearGreedValue < 30 ? '#3B82F6'
              : market.fearGreedValue < 55 ? '#35D07F'
              : market.fearGreedValue < 75 ? '#E6B450'
              : '#FF5C5C'
              : 'var(--sct-muted)'
          }
          freshness="daily"
          source="Alternative.me"
        />
        <StatCard
          label="BTC Dominance"
          value={market ? `${market.btcDominance.toFixed(1)}%` : '—%'}
          sub={market ? `Total mkt cap $${(market.totalMarketCap / 1e12).toFixed(2)}T` : 'Loading…'}
          accent="var(--sct-secondary)"
          freshness={market ? 'live' : 'cached'}
          source="CoinGecko"
        />
      </div>

      {/* Row 2 — Cycle score + market read */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Score gauge */}
        <div
          className="lg:col-span-2 rounded-xl border p-6 lg:p-8 flex flex-col items-center justify-center gap-5 min-h-[220px]"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor: cycle ? cycle.zoneColor + '40' : 'var(--sct-border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            transition: 'border-color 0.6s ease',
          }}
        >
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Skyline Cycle Score
          </p>

          <div
            className="text-7xl font-mono font-bold transition-all duration-700"
            style={{ color: cycle ? cycle.zoneColor : 'var(--sct-muted)' }}
          >
            {cycle ? cycle.score : '—'}
          </div>

          {cycle && (
            <span
              className="text-sm font-medium tracking-wider uppercase"
              style={{ color: cycle.zoneColor }}
            >
              {cycle.zoneLabel}
            </span>
          )}

          {/* Progress bar */}
          <div className="w-full max-w-sm">
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: cycle ? `${cycle.score}%` : '0%',
                  backgroundColor: cycle ? cycle.zoneColor : 'var(--sct-blue)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
              <span style={{ color: '#3B82F6' }}>Accumulate</span>
              <span style={{ color: '#35D07F' }}>Build</span>
              <span style={{ color: '#E6B450' }}>Caution</span>
              <span style={{ color: '#FF5C5C' }}>Distribution</span>
            </div>
          </div>

          {!cycle && (
            <p className="text-sm text-center" style={{ color: 'var(--sct-muted)' }}>
              Computing score…
            </p>
          )}
        </div>

        {/* Market read */}
        <InsightPanel title="Current Market Read">
          <InsightRow
            label="Cycle Zone"
            value={cycle ? cycle.zoneLabel : '—'}
            valueColor={cycle?.zoneColor}
          />
          <InsightRow
            label="Score"
            value={cycle ? `${cycle.score} / 100` : '—'}
            valueColor={cycle?.zoneColor}
          />
          <InsightRow
            label="F&G Index"
            value={market ? `${market.fearGreedValue} · ${market.fearGreedLabel}` : '—'}
          />
          <InsightRow
            label="BTC Trend"
            value={market ? fmtChange(market.btcChange24h) : '—'}
            valueColor={market ? (market.btcChange24h >= 0 ? 'var(--sct-green)' : 'var(--sct-red)') : undefined}
          />
          <InsightRow
            label="ETH Trend"
            value={market ? fmtChange(market.ethChange24h) : '—'}
            valueColor={market ? (market.ethChange24h >= 0 ? 'var(--sct-green)' : 'var(--sct-red)') : undefined}
          />
          {cycle && (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              {marketRead(cycle, market)}
            </p>
          )}
        </InsightPanel>
      </div>

      {/* Row 3 — Sub-scores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          label="On-Chain Score"
          value={onChainScore != null ? `${onChainScore}` : '—'}
          sub="MVRV · Puell · NVT · Addresses · Stables · Hash"
          accent={subScoreColor(onChainScore)}
          freshness={cycle ? 'daily' : 'cached'}
        />
        <StatCard
          label="Price Trend Score"
          value={priceTrendScore != null ? `${priceTrendScore}` : '—'}
          sub="Pi Cycle · 2YMA · Log Regression"
          accent={subScoreColor(priceTrendScore)}
          freshness={cycle ? 'daily' : 'cached'}
        />
        <StatCard
          label="Sentiment Score"
          value={sentimentScore != null ? `${sentimentScore}` : '—'}
          sub="Fear & Greed Index"
          accent={subScoreColor(sentimentScore)}
          freshness={market ? 'daily' : 'cached'}
        />
        <StatCard
          label="Macro Score"
          value={macro ? String(macro.macroScore) : '—'}
          sub={
            macro
              ? macro.macroScore < 30 ? 'Accommodative — tailwind for BTC'
              : macro.macroScore < 55 ? 'Neutral macro'
              : macro.macroScore < 75 ? 'Tightening — headwind for BTC'
              : 'Restrictive — bearish macro'
              : 'DXY · Fed · CPI · M2 · 10Y'
          }
          accent={subScoreColor(macro?.macroScore ?? null)}
          freshness={macro ? 'daily' : 'cached'}
          source="FRED"
        />
      </div>

      {/* Row 4 — BTC price chart */}
      {priceHistory
        ? <BTCMiniChart data={priceHistory.prices} />
        : <ChartSkeleton height="h-[380px]" />
      }
    </div>
  );
}

