"use client";

import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { MacroLineChart, type MacroDataPoint } from '@/components/charts/MacroLineChart';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';

type DominanceResponse = {
  current: {
    btcDominance:     number;
    ethDominance:     number;
    totalMarketCap:   number;
    altcoinDominance: number;
  };
  btcSharePoints:    MacroDataPoint[];
  ethSharePoints:    MacroDataPoint[];
  combinedCapPoints: MacroDataPoint[];
};

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  return `$${n.toFixed(0)}`;
}

function btcDomSignal(d: number): { label: string; color: string; regime: 'accumulate' | 'hold' | 'caution' | 'distribution' | 'neutral' } {
  if (d >= 60) return { label: 'BTC Season — alts lagging',     color: '#F7931A', regime: 'hold' };
  if (d >= 52) return { label: 'BTC Dominant — selective alts', color: '#E6B450', regime: 'caution' };
  if (d >= 42) return { label: 'Balanced — altcoin rotation',   color: '#35D07F', regime: 'hold' };
  return              { label: 'Alt Season — BTC losing share', color: '#FF5C5C', regime: 'distribution' };
}

function totalCapSignal(cap: number): { label: string; color: string } {
  if (cap >= 3e12)  return { label: 'Extreme expansion — late cycle',   color: '#FF5C5C' };
  if (cap >= 2e12)  return { label: 'Bull market territory',             color: '#F97316' };
  if (cap >= 1e12)  return { label: 'Mid-cycle expansion',              color: '#E6B450' };
  if (cap >= 500e9) return { label: 'Recovery — early bull',            color: '#35D07F' };
  return                   { label: 'Bear market / accumulation zone',   color: '#3B82F6' };
}

export default function DominancePage() {
  const { data, loading } = useApiData<DominanceResponse>('/api/dominance');

  const cur    = data?.current;
  const btcSig = btcDomSignal(cur?.btcDominance ?? 50);
  const capSig = totalCapSignal(cur?.totalMarketCap ?? 1e12);

  const hasCharts = (data?.btcSharePoints?.length ?? 0) > 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Market Structure"
        subtitle="BTC & ETH dominance, total crypto market cap and cycle context"
        regime={btcSig.regime}
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          label="BTC Dominance"
          value={cur ? `${cur.btcDominance.toFixed(1)}%` : '—'}
          sub={btcSig.label}
          accent="#F7931A"
          freshness="live"
          source="CoinGecko"
        />
        <StatCard
          label="ETH Dominance"
          value={cur ? `${cur.ethDominance.toFixed(1)}%` : '—'}
          sub={cur ? `Alt season threshold ~55%` : '—'}
          accent="#627EEA"
          freshness="live"
          source="CoinGecko"
        />
        <StatCard
          label="Altcoin Dominance"
          value={cur ? `${cur.altcoinDominance.toFixed(1)}%` : '—'}
          sub={cur?.altcoinDominance != null
            ? cur.altcoinDominance > 35
              ? 'Alts in control — late cycle risk'
              : 'Capital concentrated in majors'
            : '—'
          }
          accent={cur?.altcoinDominance != null
            ? cur.altcoinDominance > 35 ? '#FF5C5C' : '#35D07F'
            : 'var(--sct-muted)'
          }
          freshness="live"
          source="CoinGecko"
        />
        <StatCard
          label="Total Market Cap"
          value={cur ? fmtCap(cur.totalMarketCap) : '—'}
          sub={capSig.label}
          accent={capSig.color}
          freshness="live"
          source="CoinGecko"
        />
      </div>

      {/* Charts — 3 col */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {[
          {
            title:   'BTC Share (vs BTC + ETH)',
            series:  data?.btcSharePoints ?? [],
            color:   '#F7931A',
            unit:    '%',
            decimals: 1,
            id:      'btcshare',
            desc:    'BTC as % of combined BTC + ETH market cap. Rising = capital rotating to Bitcoin over Ethereum.',
          },
          {
            title:   'ETH Share (vs BTC + ETH)',
            series:  data?.ethSharePoints ?? [],
            color:   '#627EEA',
            unit:    '%',
            decimals: 1,
            id:      'ethshare',
            desc:    'ETH share rising after BTC share peaks = the classic rotation into Ethereum and then alts.',
          },
          {
            title:   'BTC + ETH Combined Cap',
            series:  data?.combinedCapPoints ?? [],
            color:   '#35D07F',
            unit:    'T',
            decimals: 2,
            id:      'combinedcap',
            desc:    'Combined BTC + ETH market cap in trillions. Bull cycles expand this; bear markets compress it.',
          },
        ].map(c => (
          <div
            key={c.id}
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
              {c.title}
            </p>
            <p className="text-[11px] mb-3" style={{ color: 'var(--sct-muted)' }}>{c.desc}</p>
            {loading
              ? <ChartSkeleton height="h-44" />
              : hasCharts
                ? <MacroLineChart id={c.id} data={c.series} color={c.color} unit={c.unit} decimals={c.decimals} />
                : <div className="h-44 flex items-center justify-center text-xs" style={{ color: 'var(--sct-muted)' }}>
                    Chart data unavailable — CoinGecko rate limit
                  </div>
            }
          </div>
        ))}
      </div>

      {/* Insight panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <InsightPanel title="Structure Read">
          <InsightRow label="BTC Dominance"     value={cur ? `${cur.btcDominance.toFixed(1)}%` : '—'} valueColor="#F7931A" />
          <InsightRow label="ETH Dominance"     value={cur ? `${cur.ethDominance.toFixed(1)}%` : '—'} valueColor="#627EEA" />
          <InsightRow label="Altcoin Dom."      value={cur ? `${cur.altcoinDominance.toFixed(1)}%` : '—'} />
          <InsightRow label="Total Cap"         value={cur ? fmtCap(cur.totalMarketCap) : '—'} valueColor={capSig.color} />
          <InsightRow label="Market Phase"      value={btcSig.label} valueColor={btcSig.color} />
        </InsightPanel>

        <InsightPanel title="Dominance Cycle Playbook">
          <InsightRow label="> 60% BTC.D"    value="BTC season — hold BTC, avoid alts"    valueColor="#F7931A" />
          <InsightRow label="52–60% BTC.D"   value="BTC dominant — selective large caps"  valueColor="#E6B450" />
          <InsightRow label="42–52% BTC.D"   value="Rotation zone — ETH and large alts"  valueColor="#35D07F" />
          <InsightRow label="< 42% BTC.D"    value="Alt season — extreme risk, late cycle" valueColor="#FF5C5C" />
          <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            Bitcoin dominance typically peaks at cycle tops before capital rotates into Ethereum and then
            small caps. Falling BTC.D with rising total market cap = altcoin season in progress.
          </p>
        </InsightPanel>
      </div>
    </div>
  );
}

