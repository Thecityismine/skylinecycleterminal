import { fetchEtfFlows } from '@/lib/api/etfFlows';
import {
  buildChartPoints,
  computeStats,
  computeFlowScore,
  computeDivergence,
} from '@/lib/indicators/etfFlows';
import { EtfFlowChartSection } from '@/components/charts/EtfFlowChartSection';
import { PageHeader }   from '@/components/dashboard/PageHeader';
import { StatCard }     from '@/components/dashboard/StatCard';

export const dynamic = 'force-dynamic';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtFlow(v: number | null): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const sign = v >= 0 ? '+' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}

function flowTrend(v: number | null): 'up' | 'down' | 'neutral' {
  if (v == null) return 'neutral';
  return v > 0 ? 'up' : v < 0 ? 'down' : 'neutral';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EtfFlowsPage() {
  let points = [] as Awaited<ReturnType<typeof buildChartPoints>>;
  let fetchError = false;

  try {
    const raw = await fetchEtfFlows();
    if (raw.length > 0) {
      points = buildChartPoints(raw);
    }
  } catch {
    fetchError = true;
  }

  const stats      = computeStats(points);
  const score      = computeFlowScore(points);
  const divergence = computeDivergence(points);

  const todayFlow = points.at(-1)?.totalNetFlowUsd ?? null;
  const lastDate  = points.at(-1)?.time ?? '';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin ETF Flows"
        subtitle="Daily institutional Bitcoin demand through U.S. spot ETF inflows and outflows"
      />

      {/* ── Flow Regime Banner ──────────────────────────────────────────── */}
      {points.length > 0 && (
        <div
          className="flex items-center gap-4 rounded-xl border px-5 py-4"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor: score.color,
            borderWidth: 1,
          }}
        >
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: score.color }} />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-base font-semibold" style={{ color: score.color }}>
                {score.label}
              </p>
              <span
                className="px-2.5 py-0.5 rounded text-xs font-mono border"
                style={{
                  backgroundColor: `${score.color}18`,
                  borderColor:     `${score.color}40`,
                  color:           score.color,
                }}
              >
                ETF Flow Score {score.score.toFixed(0)} / 100
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
              {score.description}
            </p>
          </div>
          {todayFlow != null && (
            <div className="hidden sm:block text-right shrink-0">
              <p
                className="text-2xl font-mono font-bold"
                style={{ color: todayFlow >= 0 ? '#35D07F' : '#F85149' }}
              >
                {fmtFlow(todayFlow)}
              </p>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                Today Net Flow
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Today Net Flow"
            value={fmtFlow(todayFlow)}
            sub={todayFlow != null
              ? todayFlow >= 0 ? 'Net inflow day' : 'Net outflow day'
              : 'No data yet'}
            trend={flowTrend(todayFlow)}
            accent={todayFlow != null ? (todayFlow >= 0 ? '#35D07F' : '#F85149') : undefined}
            freshness="daily"
            source="Farside"
          />
          <StatCard
            label="7D Net Flow"
            value={fmtFlow(stats.flow7d)}
            sub={stats.flow7d != null
              ? stats.flow7d >= 0 ? 'Net positive week' : 'Net negative week'
              : 'Calculating…'}
            trend={flowTrend(stats.flow7d)}
            accent={stats.flow7d != null ? (stats.flow7d >= 0 ? '#35D07F' : '#F85149') : undefined}
            freshness="daily"
          />
          <StatCard
            label="30D Net Flow"
            value={fmtFlow(stats.flow30d)}
            sub={stats.flow30d != null
              ? stats.flow30d >= 0 ? 'Net positive month' : 'Net negative month'
              : 'Calculating…'}
            trend={flowTrend(stats.flow30d)}
            accent={stats.flow30d != null ? (stats.flow30d >= 0 ? '#35D07F' : '#F85149') : undefined}
            freshness="daily"
          />
          <StatCard
            label="Cumulative Flows"
            value={fmtFlow(stats.cumTotal)}
            sub="Since ETF launch (Jan 2024)"
            trend={flowTrend(stats.cumTotal)}
            accent={stats.cumTotal >= 0 ? '#5B84FF' : '#F85149'}
            freshness="daily"
          />
          <StatCard
            label="Flow Regime"
            value={score.score.toFixed(0)}
            sub={score.label}
            accent={score.color}
            freshness="daily"
          />
        </div>
      )}

      {/* ── No data / error state ────────────────────────────────────────── */}
      {(fetchError || points.length === 0) && (
        <div
          className="rounded-xl border px-5 py-12 text-center"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>
            {fetchError
              ? 'Unable to fetch ETF flow data. Farside may be temporarily unavailable.'
              : 'No ETF flow data available.'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--sct-muted)' }}>
            Data source: <a href="https://farside.co.uk/bitcoin-etf-flow-all-data/" target="_blank" rel="noopener noreferrer"
              style={{ color: '#5B84FF' }}>farside.co.uk</a>
          </p>
        </div>
      )}

      {/* ── Main chart section ───────────────────────────────────────────── */}
      {points.length > 0 && stats && (
        <EtfFlowChartSection
          points={points}
          score={score}
          divergence={divergence}
          flow7d={stats.flow7d}
          flow30d={stats.flow30d}
          cumTotal={stats.cumTotal}
          streak={stats.streak}
          streakDir={stats.streakDir}
          positiveIssuers={stats.positiveIssuers}
          negativeIssuers={stats.negativeIssuers}
          totalIssuers={stats.totalIssuers}
          lastDate={lastDate}
        />
      )}

      {/* ── ETF Flow Score methodology ───────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          ETF Flow Score — Zone Reference
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left pb-2 pr-6">Score</th>
                <th className="text-left pb-2 pr-6">Zone</th>
                <th className="text-left pb-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { range: '75–100', zone: 'Strong Institutional Accumulation', color: '#35D07F',
                  desc: '7D and 30D flows both positive. Multiple issuers reporting inflows. Structural tailwind.' },
                { range: '50–75',  zone: 'Improving Demand',                  color: '#5B84FF',
                  desc: 'Net positive trend developing. Watch for confirmation across multiple issuers.' },
                { range: '25–50',  zone: 'Institutional Indecision',          color: '#EAB84D',
                  desc: '7D flow mixed, 30D near zero. ETFs are adding neither buying nor selling pressure.' },
                { range: '0–25',   zone: 'Institutional De-Risking',          color: '#F85149',
                  desc: '7D and 30D flows negative. Multiple major issuers reporting outflows.' },
              ].map(row => (
                <tr key={row.range} style={{ borderTop: '1px solid var(--sct-border)' }}>
                  <td className="py-2 pr-6" style={{ color: 'var(--sct-muted)' }}>{row.range}</td>
                  <td className="py-2 pr-6 font-semibold" style={{ color: row.color }}>{row.zone}</td>
                  <td className="py-2" style={{ color: 'var(--sct-muted)' }}>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Methodology ─────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          How to Read ETF Flows
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#35D07F' }}>Net Inflows</p>
            <p>
              New capital entering spot BTC ETFs. Sustained positive flows indicate institutional spot demand
              is growing. Single large inflow days are less meaningful than multi-week positive trends.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#F85149' }}>Net Outflows</p>
            <p>
              Capital leaving spot BTC ETFs. Persistent outflows add mechanical selling pressure as ETFs
              must sell underlying BTC to meet redemptions. GBTC outflows post-conversion were a major
              2024 headwind.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#5B84FF' }}>Breadth</p>
            <p>
              The number of ETFs seeing inflows vs outflows matters. Broad-based inflows across IBIT, FBTC,
              ARKB, and BITB simultaneously signal stronger institutional demand than a single large issuer
              moving alone.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#EAB84D' }}>Cumulative vs Daily</p>
            <p>
              Daily bars show tactical flow. Cumulative flows show structural demand. Rising cumulative
              through price dips means institutions are buying weakness — one of the strongest intermediate
              signals.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#A78BFA' }}>Flow / Price Divergence</p>
            <p>
              Bullish: ETF flows improving while price is flat or declining. Bearish: flows weakening while
              price rises. Divergences tend to resolve in the direction of the flows over a 2–6 week horizon.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--sct-text)' }}>Key Limitation</p>
            <p>
              ETF flows are not a perfect day-by-day BTC price predictor. They are one of the cleanest
              real-time windows into institutional spot demand. Combine with on-chain MVRV, Cycle Score,
              and macro context before acting.
            </p>
          </div>
        </div>
        <div
          className="mt-5 pt-4 border-t text-xs"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          <span style={{ color: 'var(--sct-text)' }}>Data source: </span>
          Farside Investors (farside.co.uk) — daily U.S. spot Bitcoin ETF flow data aggregated from
          ETF issuers. BTC price from CoinMetrics Community API. Data refreshed hourly.
        </div>
      </div>
    </div>
  );
}
