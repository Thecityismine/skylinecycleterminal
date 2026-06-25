import { fetchBTCExchangeReserve } from '@/lib/api/coinmetrics';
import {
  buildHodlWavePoints,
  getHodlRegime,
  getDistributionScore,
  HODL_CYCLE_EVENTS,
} from '@/lib/indicators/exchangeReserve';
import { BTCHodlWaveChartSection } from '@/components/charts/BTCHodlWaveChartSection';
import { PageHeader }       from '@/components/dashboard/PageHeader';
import { StatCard }         from '@/components/dashboard/StatCard';

export const dynamic = 'force-dynamic';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtPct(v: number | null | undefined): string {
  if (v == null) return 'â€”';
  return `${v.toFixed(2)}%`;
}

function fmtPp(v: number | null | undefined): string {
  if (v == null) return 'â€”';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)} pp`;
}

function fmtBtc(v: number | null | undefined): string {
  if (v == null) return 'â€”';
  return `${(v / 1_000_000).toFixed(3)}M BTC`;
}

function fmtUSD(v: number | null | undefined): string {
  if (v == null) return 'â€”';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

// â”€â”€â”€ Historical snapshots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HISTORICAL_SNAPSHOTS = [
  { period: 'Peak 2017',       date: 'Dec 2017', exchPct: '~27%', change: 'Rising sharply',   btcPrice: '~$19,900', regime: 'Distribution',    color: '#FF5C5C' },
  { period: 'Bear Low 2018',   date: 'Dec 2018', exchPct: '~22%', change: 'Elevated / flat',  btcPrice: '~$3,200',  regime: 'Market Stress',   color: '#E6B450' },
  { period: 'Accumulation',    date: 'Dec 2020', exchPct: '~15%', change: 'Declining',         btcPrice: '~$29,000', regime: 'Accumulation',    color: '#3B82F6' },
  { period: 'Peak 2021',       date: 'Nov 2021', exchPct: '~18%', change: 'Rose from lows',   btcPrice: '~$69,000', regime: 'Distribution',    color: '#FF5C5C' },
  { period: 'Bear Low 2022',   date: 'Nov 2022', exchPct: '~16%', change: 'Mixed signals',    btcPrice: '~$15,500', regime: 'Market Stress',   color: '#E6B450' },
  { period: 'Recovery 2023',   date: 'Dec 2023', exchPct: '~14%', change: 'Declining trend',  btcPrice: '~$44,000', regime: 'Accumulation',    color: '#3B82F6' },
];

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default async function HodlWavePage() {
  const points = await (async () => {
    try {
      const raw = await fetchBTCExchangeReserve('2016-01-01');
      return buildHodlWavePoints(raw);
    } catch {
      return [];
    }
  })();

  const last  = points.length > 0 ? points[points.length - 1] : null;
  const regime = getHodlRegime(points);
  const score  = getDistributionScore(points);

  const pageRegime = score.score < 25 ? 'accumulate'
    : score.score < 50 ? 'neutral'
    : score.score < 75 ? 'caution'
    : 'distribution';

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Bitcoin Long-Term Holder Behavior"
        subtitle="BTC exchange supply reserve â€” declining coins on exchanges signals accumulation and long-term holding"
        regime={pageRegime}
      />

      {/* â”€â”€ Data source note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{ backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }}
      >
        <span className="text-blue-400 text-base shrink-0">â“˜</span>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(147,197,253,0.9)' }}>
          <strong>Methodology:</strong> This page tracks the percentage of Bitcoin&apos;s circulating supply
          held on centralized exchanges (CoinMetrics <code>SplyExNtv / SplyCur</code>).
          When exchange supply falls, coins move to cold storage â€” indicating long-term holding (HODL) behavior.
          When exchange supply rises, coins return to exchanges â€” which may signal preparation to sell.
          True 1Y+ HODL wave data (supply inactive for 365+ days) is not available in the free API tier.
          Exchange reserve is the closest freely available proxy.
        </p>
      </div>

      {/* â”€â”€ Regime banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="rounded-xl border px-5 py-4 flex items-center gap-4"
        style={{
          backgroundColor: `${regime.color}12`,
          borderColor:     `${regime.color}35`,
        }}
      >
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: regime.color }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: regime.color }}>{regime.label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{regime.description}</p>
        </div>
      </div>

      {/* â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Exchange Reserve"
          value={last ? fmtPct(last.exchPct) : 'â€”'}
          sub={last ? fmtBtc(last.exchBtc) : 'Loadingâ€¦'}
          accent="#F7931A"
        />
        <StatCard
          label="30D Change"
          value={last ? fmtPp(last.change30d) : 'â€”'}
          sub={last && last.change30d != null
            ? last.change30d < 0 ? 'Coins leaving exchanges' : 'Coins entering exchanges'
            : ''}
          accent={last?.change30d != null
            ? last.change30d < 0 ? '#35D07F' : '#FF5C5C'
            : 'var(--sct-muted)'}
        />
        <StatCard
          label="90D Change"
          value={last ? fmtPp(last.change90d) : 'â€”'}
          sub={last && last.change90d != null
            ? last.change90d < 0 ? 'Net accumulation trend' : 'Net distribution trend'
            : ''}
          accent={last?.change90d != null
            ? last.change90d < 0 ? '#35D07F' : '#FF5C5C'
            : 'var(--sct-muted)'}
        />
        <StatCard
          label="LTH Trend"
          value={regime.label}
          sub="90D exchange supply vs price"
          accent={regime.color}
        />
        <StatCard
          label="Distribution Score"
          value={`${score.score} / 100`}
          sub={score.label}
          accent={score.color}
        />
      </div>

      {/* â”€â”€ BTC price + current level â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {last && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="BTC Price"
            value={fmtUSD(last.btcClose)}
            sub="Current"
            accent="rgba(230,237,243,0.8)"
          />
          <StatCard
            label="30D SMA"
            value={fmtPct(last.exch30d)}
            sub="30-day average exchange %"
            accent="#F2B84B"
          />
          <StatCard
            label="90D SMA"
            value={fmtPct(last.exch90d)}
            sub="90-day average exchange %"
            accent="#3B82F6"
          />
          <StatCard
            label="180D Change"
            value={fmtPp(last.change180d)}
            sub="6-month supply flow"
            accent={last.change180d != null
              ? last.change180d < 0 ? '#35D07F' : '#FF5C5C'
              : 'var(--sct-muted)'}
          />
        </div>
      )}

      {/* â”€â”€ Main chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <BTCHodlWaveChartSection
        points={points}
        regimeLabel={regime.label}
        regimeColor={regime.color}
        exchPct={last?.exchPct ?? null}
        change30d={last?.change30d ?? null}
        change90d={last?.change90d ?? null}
        btcClose={last?.btcClose ?? null}
        scoreScore={score.score}
        scoreLabel={score.label}
        scoreColor={score.color}
      />

      {/* â”€â”€ Regime + Distribution Score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Regime panel */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            LTH Regime Analysis
          </p>
          <div
            className="rounded-lg border p-4 mb-4"
            style={{ backgroundColor: `${regime.color}10`, borderColor: `${regime.color}30` }}
          >
            <p className="text-base font-bold mb-1" style={{ color: regime.color }}>{regime.label}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              {regime.description}
            </p>
          </div>

          <div className="space-y-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#35D07F' }} />
              <span><strong style={{ color: 'var(--sct-secondary)' }}>Accumulation:</strong> Exchange supply falling, coins to cold storage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#3B82F6' }} />
              <span><strong style={{ color: 'var(--sct-secondary)' }}>Healthy Expansion:</strong> Exchange supply falling, price rising â€” holders not selling</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#E6B450' }} />
              <span><strong style={{ color: 'var(--sct-secondary)' }}>Market Stress:</strong> Exchange supply rising during price declines</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#FF5C5C' }} />
              <span><strong style={{ color: 'var(--sct-secondary)' }}>Distribution Risk:</strong> Exchange supply rising into price strength</span>
            </div>
          </div>
        </div>

        {/* Distribution score panel */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            LTH Distribution Score
          </p>

          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-5xl font-mono font-bold" style={{ color: score.color }}>
              {score.score}
            </span>
            <span className="text-sm font-medium" style={{ color: score.color }}>{score.label}</span>
          </div>

          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--sct-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score.score}%`, backgroundColor: score.color }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono mb-4" style={{ color: 'var(--sct-muted)' }}>
            <span style={{ color: '#3B82F6' }}>0 â€” Accumulation</span>
            <span style={{ color: '#35D07F' }}>25</span>
            <span style={{ color: '#E6B450' }}>50</span>
            <span style={{ color: '#FF5C5C' }}>75 â€” Distribution</span>
            <span>100</span>
          </div>

          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--sct-muted)' }}>
            {score.description}
          </p>

          <div className="space-y-2">
            {[
              { label: '90D Exchange Trend (40%)', value: score.breakdown.exch90d },
              { label: '180D Exchange Trend (25%)', value: score.breakdown.exch180d },
              { label: 'BTC 90D Return (15%)', value: score.breakdown.btcReturn },
              { label: 'BTC vs 200DMA (10%)', value: score.breakdown.btcVsMa },
              { label: 'Exchange % vs Avg (10%)', value: score.breakdown.exchVsAvg },
            ].map((c) => {
              const color = c.value < 25 ? '#3B82F6' : c.value < 50 ? '#35D07F' : c.value < 75 ? '#E6B450' : '#FF5C5C';
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
      </div>

      {/* â”€â”€ Historical cycle snapshots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
          Historical Cycle Reference
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
                {['Period', 'Date', 'Exchange Reserve', '90D Trend', 'BTC Price', 'Regime'].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 pr-4 font-medium"
                    style={{ color: 'var(--sct-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_SNAPSHOTS.map((r) => (
                <tr key={r.period} style={{ borderBottom: '1px solid var(--sct-border)' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--sct-secondary)' }}>{r.period}</td>
                  <td className="py-2.5 pr-4 font-mono"   style={{ color: 'var(--sct-muted)' }}>{r.date}</td>
                  <td className="py-2.5 pr-4 font-mono"   style={{ color: '#F7931A' }}>{r.exchPct}</td>
                  <td className="py-2.5 pr-4"             style={{ color: 'var(--sct-muted)' }}>{r.change}</td>
                  <td className="py-2.5 pr-4 font-mono"   style={{ color: 'rgba(230,237,243,0.7)' }}>{r.btcPrice}</td>
                  <td className="py-2.5 pr-4 font-medium" style={{ color: r.color }}>{r.regime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-3" style={{ color: 'var(--sct-muted)' }}>
          Historical figures are approximate reference points. Exchange reserve attribution may vary slightly by data provider methodology.
        </p>
      </div>

      {/* â”€â”€ Interpretation panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Exchange Supply Falling',
            color: '#3B82F6',
            content: 'Coins are leaving exchanges and moving to private wallets and cold storage. This is consistent with long-term holding behavior â€” investors less likely to sell in the near term.',
          },
          {
            label: 'Exchange Supply Rising',
            color: '#FF5C5C',
            content: 'More coins are arriving on exchanges. This historically precedes distribution phases â€” holders positioning coins where they can be sold quickly.',
          },
          {
            label: 'Low Exchange Reserve',
            color: '#35D07F',
            content: 'A historically low % of supply on exchanges means less immediate sell pressure. Coins in cold storage cannot be sold instantly, reducing available liquidity on the ask side.',
          },
          {
            label: 'Interpretation Caveats',
            color: '#6B7280',
            content: 'Exchange supply alone is not a top or bottom indicator. Coins move between exchanges and wallets for many reasons â€” custody changes, ETF collateral, DeFi, and internal transfers all register as flows.',
          },
        ].map((p) => (
          <div
            key={p.label}
            className="rounded-xl border p-4"
            style={{ backgroundColor: `${p.color}08`, borderColor: `${p.color}25` }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: p.color }}>{p.label}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{p.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
