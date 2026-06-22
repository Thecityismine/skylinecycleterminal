import { fetchBTCMVRVData } from '@/lib/api/coinmetrics';
import {
  buildSoprPoints,
  getSoprRegime,
  getSoprReclaimStatus,
  getSoprTrendRead,
  HISTORICAL_SOPR_EVENTS,
} from '@/lib/indicators/sopr';
import { BTCSoprChart }  from '@/components/charts/BTCSoprChart';
import { PageHeader }    from '@/components/dashboard/PageHeader';
import { StatCard }      from '@/components/dashboard/StatCard';

export const revalidate = 86400;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt3(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toFixed(3);
}

function fmtDev(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(3)}`;
}

function fmtUSD(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SoprPage() {
  const points = await (async () => {
    try {
      const raw = await fetchBTCMVRVData('2011-01-01');
      return buildSoprPoints(raw);
    } catch {
      return [];
    }
  })();

  const last    = points.length > 0 ? points[points.length - 1] : null;
  const regime  = getSoprRegime(points);
  const reclaim = getSoprReclaimStatus(points);
  const trend   = getSoprTrendRead(points);

  const avg30dev = last?.sma30 != null ? last.sma30 - 1 : null;
  const avg90dev = last?.sma90 != null ? last.sma90 - 1 : null;

  // Cards
  const devColor = !last ? '#94A3B8' : last.soprDeviation >= 0 ? '#35D07F' : '#F85149';

  const trend30Color = trend.trend30 === 'Rising' ? '#35D07F'
    : trend.trend30 === 'Falling' ? '#FF5C5C' : '#94A3B8';
  const trend90Color = trend.trend90 === 'Rising' ? '#35D07F'
    : trend.trend90 === 'Falling' ? '#FF5C5C' : '#94A3B8';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin SOPR"
        subtitle="Realized profit and loss behavior of coins moving on-chain"
      />

      {/* ── Regime banner ───────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 rounded-xl border px-5 py-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: regime.color, borderWidth: 1 }}
      >
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: regime.color }} />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-base font-semibold" style={{ color: regime.color }}>{regime.label}</p>
            <span
              className="px-2.5 py-0.5 rounded text-xs font-mono border"
              style={{
                backgroundColor: `${regime.color}18`,
                borderColor: `${regime.color}40`,
                color: regime.color,
              }}
            >
              MVRV Deviation {last ? fmtDev(last.soprDeviation) : '—'}
            </span>
            <span
              className="px-2.5 py-0.5 rounded text-xs font-mono border"
              style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', color: reclaim.color }}
            >
              {reclaim.label}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>{regime.description}</p>
        </div>
        {last && (
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-2xl font-mono font-bold" style={{ color: '#F7931A' }}>
              {fmtUSD(last.btcClose)}
            </p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              BTC Price
            </p>
          </div>
        )}
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      {last && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="MVRV Ratio (SOPR Proxy)"
            value={fmt3(last.rawSopr)}
            sub={last.rawSopr >= 1 ? 'Above break-even' : 'Below break-even'}
            accent={devColor}
            freshness="daily"
            source="CoinMetrics"
          />
          <StatCard
            label="MVRV Deviation"
            value={fmtDev(last.soprDeviation)}
            sub={last.soprDeviation >= 0 ? 'Net profit territory' : 'Net loss territory'}
            accent={devColor}
            freshness="daily"
          />
          <StatCard
            label="30D Average"
            value={last.sma30 != null ? fmt3(last.sma30) : '—'}
            sub={avg30dev != null ? `Deviation: ${fmtDev(avg30dev)}` : 'Calculating…'}
            accent="#F2B84B"
            freshness="daily"
          />
          <StatCard
            label="90D Average"
            value={last.sma90 != null ? fmt3(last.sma90) : '—'}
            sub={avg90dev != null ? `Deviation: ${fmtDev(avg90dev)}` : 'Calculating…'}
            accent="#3B82F6"
            freshness="daily"
          />
          <StatCard
            label="Market Regime"
            value={regime.label}
            sub={reclaim.label}
            accent={regime.color}
            freshness="daily"
          />
        </div>
      )}

      {/* ── Data source note ────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 rounded-lg border px-4 py-3 text-xs"
        style={{ backgroundColor: `#3B82F610`, borderColor: `#3B82F640`, color: 'var(--sct-muted)' }}
      >
        <span className="mt-0.5 shrink-0" style={{ color: '#3B82F6' }}>ⓘ</span>
        <p>
          <span style={{ color: '#3B82F6' }}>Data source note: </span>
          True SOPR (Spent Output Profit Ratio) requires UTXO-level on-chain data that is not available
          in free public APIs. This page uses the <strong style={{ color: 'var(--sct-text)' }}>MVRV Ratio</strong> from
          CoinMetrics as a directional proxy — both metrics center on 1.0 (break-even), go green above
          and red below, and identify the same profit/loss regimes at the cycle level.
          MVRV deviation = MVRV − 1.0, equivalent to SOPR − 1.0.
        </p>
      </div>

      {/* ── Main chart ──────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Bitcoin SOPR (MVRV Deviation) · BTC Price — Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Green bars = above 1.0 (profit territory) · Red bars = below 1.0 (loss territory) ·
            Zero line = MVRV 1.0 (break-even) · Dashed verticals = halvings
          </p>
        </div>
        {points.length > 0 ? (
          <BTCSoprChart points={points} />
        ) : (
          <p className="text-sm text-center py-16" style={{ color: 'var(--sct-muted)' }}>
            Unable to load MVRV data.
          </p>
        )}
      </div>

      {/* ── Secondary panels ────────────────────────────────────────────── */}
      {last && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* aSOPR Reclaim Module */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: `${reclaim.color}40` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: reclaim.color }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
                Break-Even Reclaim Analysis
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Current MVRV',   value: fmt3(last.rawSopr),     color: devColor      },
                { label: '30D Average',    value: fmt3(last.sma30),       color: '#F2B84B'     },
                { label: '90D Average',    value: fmt3(last.sma90),       color: '#3B82F6'     },
                { label: 'Status',         value: reclaim.label,          color: reclaim.color },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-3 border" style={{ borderColor: 'var(--sct-border)' }}>
                  <p className="text-[10px] font-mono uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
                    {item.label}
                  </p>
                  <p className="text-sm font-mono font-bold" style={{ color: item.color }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="mt-3 pt-3 border-t text-xs leading-relaxed"
              style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
            >
              {reclaim.interpretation}
            </div>
          </div>

          {/* SOPR Trend Read */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
              SOPR Trend Read
            </p>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: 'Current SOPR',           value: trend.currentLabel,  color: devColor      },
                { label: '30D Trend',              value: trend.trend30,       color: trend30Color  },
                { label: '90D Trend',              value: trend.trend90,       color: trend90Color  },
                { label: 'Profit / Loss Behavior', value: trend.netBehavior,   color: devColor      },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--sct-border)' }}>
                  <span style={{ color: 'var(--sct-muted)' }}>{row.label}</span>
                  <span className="font-semibold" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div
              className="mt-4 pt-3 border-t text-xs leading-relaxed"
              style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
            >
              <p className="font-semibold mb-1" style={{ color: 'var(--sct-text)' }}>Market Read</p>
              <p>{trend.marketRead}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Historical regime table ──────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          Historical SOPR Regimes — Reference Table
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left pb-3 pr-6">Period</th>
                <th className="text-left pb-3 pr-6">SOPR Behavior</th>
                <th className="text-left pb-3">Market Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_SOPR_EVENTS.map((ev) => (
                <tr key={ev.period} style={{ borderTop: '1px solid var(--sct-border)' }}>
                  <td className="py-2.5 pr-6 font-semibold" style={{ color: 'var(--sct-text)' }}>
                    {ev.period}
                  </td>
                  <td className="py-2.5 pr-6" style={{ color: '#F2B84B' }}>
                    {ev.soprBehavior}
                  </td>
                  <td className="py-2.5" style={{ color: 'var(--sct-muted)' }}>
                    {ev.interpretation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Interpretation panel ─────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--sct-text)' }}>
          How to Read SOPR
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#FF5C5C' }}>Capitulation</p>
            <p>
              MVRV materially below 1.0. Holders are at aggregate loss. Historically coincides with
              bear market lows — but loss realization alone does not confirm a bottom.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#E6B450' }}>Bear Recovery</p>
            <p>
              SOPR attempts to reclaim 1.0 after a period of loss. Confirmation requires
              the market to sustain above break-even for 2+ weeks. A rejection at 1.0 signals bear structure remains.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#35D07F' }}>Healthy Bull</p>
            <p>
              SOPR above 1.0. Holders in profit. Pullbacks to near 1.0 that get absorbed
              without breaking below are constructive — they represent distribution followed by re-accumulation.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: '#F97316' }}>Distribution Risk</p>
            <p>
              SOPR elevated well above 1.0 for a prolonged period. Market cap at major premium above
              realized value. Historically coincides with cycle top formation when combined with other signals.
            </p>
          </div>
        </div>
        <div
          className="mt-4 pt-4 border-t text-xs leading-relaxed"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          <p>
            <span style={{ color: 'var(--sct-text)' }}>Key principle: </span>
            SOPR shows whether Bitcoin holders moving coins are realizing profits or losses. The key signal
            is not one red or green bar — it is whether SOPR can reclaim and hold the break-even level (1.0)
            over time. A sustained hold above 1.0 after a period below it is one of the most reliable
            early-cycle recovery signals in Bitcoin&apos;s history.
          </p>
          <p className="mt-2">
            <span style={{ color: 'var(--sct-text)' }}>Data source: </span>
            MVRV Ratio (CapMVRVCur) from CoinMetrics Community API, updated daily.
            MVRV deviation (MVRV − 1) is used as a free-tier directional proxy for SOPR − 1.
            Both metrics identify the same market profit/loss regimes at the cycle level.
          </p>
        </div>
      </div>
    </div>
  );
}
