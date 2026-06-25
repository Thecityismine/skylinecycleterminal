import {
  fetchBTCMVRVData,
  fetchBTCHashRibbon,
  fetchBTCExchangeReserve,
} from '@/lib/api/coinmetrics';
import {
  buildBottomConfluencePoints,
  findConfluencePeriods,
  findConfluenceEvents,
  getConfluenceLabel,
  getSignalTimeline,
} from '@/lib/indicators/bottomConfluence';
import type { SignalStatus } from '@/lib/indicators/bottomConfluence';
import { BTCBottomConfluenceChartSection } from '@/components/charts/BTCBottomConfluenceChartSection';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/dashboard/PageHeader';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusAccent(s: SignalStatus): string {
  return s === 'confirmed' ? '#35D07F' : s === 'developing' ? '#E6B450' : '#6B7280';
}

function statusLabel(s: SignalStatus): string {
  return s === 'confirmed' ? 'Confirmed' : s === 'developing' ? 'Developing' : 'Inactive';
}

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtRet(v: number | null): { text: string; color: string } {
  if (v == null) return { text: '—', color: '#6B7280' };
  return {
    text:  `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`,
    color: v >= 0 ? '#35D07F' : '#FF5C5C',
  };
}

function SignalRow({
  n, title, value, sub, status,
}: {
  n: number; title: string; value: string; sub: string; status: SignalStatus;
}) {
  const color = statusAccent(status);
  return (
    <div
      className="rounded-xl p-4 border flex items-start gap-4"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: color + '40' }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={{ backgroundColor: color + '22', color }}
      >
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-medium" style={{ color: 'var(--sct-text)' }}>{title}</span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ backgroundColor: color + '22', color }}
          >
            {statusLabel(status)}
          </span>
        </div>
        <p className="text-lg font-mono font-semibold" style={{ color }}>{value}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BottomConfluencePage() {
  const [mvrvData, hashData, exchangeData] = await Promise.all([
    fetchBTCMVRVData('2012-01-01'),
    fetchBTCHashRibbon('2012-01-01'),
    fetchBTCExchangeReserve('2016-01-01'),
  ]);

  const points  = buildBottomConfluencePoints(mvrvData, hashData, exchangeData);
  const periods = findConfluencePeriods(points);
  const events  = findConfluenceEvents(points);
  const timeline = getSignalTimeline(points);

  if (!points.length) {
    return (
      <main className="p-6">
        <PageHeader title="Bear-Market Bottom Confluence" subtitle="On-chain stress signal alignment" />
        <p style={{ color: 'var(--sct-muted)' }}>No data available.</p>
      </main>
    );
  }

  const last = points[points.length - 1];
  const regime = getConfluenceLabel(last.confluenceScore);

  // Confluence score donut segments
  const scoreMax = 4;
  const scorePct = (last.confluenceScore / scoreMax) * 100;

  const signals: Array<{
    n: number; title: string; value: string; sub: string; status: SignalStatus;
  }> = [
    {
      n: 1,
      title:  'Supply in Profit (MVRV)',
      value:  last.mvrv.toFixed(2),
      sub:    `MVRV < 1.0 = majority of supply at loss. Current: ${last.mvrv.toFixed(2)}. Threshold: 1.0 (confirmed) / 1.5 (developing)`,
      status: last.supplyStatus,
    },
    {
      n: 2,
      title:  'Hash Ribbon (Miner Capitulation)',
      value:  last.hrRatio != null ? last.hrRatio.toFixed(3) : '—',
      sub:    `30D/60D hashrate MA ratio. < 1.0 = miners selling at a loss (capitulation). Current: ${last.hrRatio?.toFixed(3) ?? '—'}`,
      status: last.hashStatus,
    },
    {
      n: 3,
      title:  '2Y Cost Basis (Price vs 2Y MA)',
      value:  last.priceTo2y != null ? `${(last.priceTo2y * 100).toFixed(0)}%` : '—',
      sub:    `Price / 2-Year Moving Average. < 100% = price below 2Y cost basis → recent buyers underwater. Current: ${last.priceTo2y != null ? (last.priceTo2y * 100).toFixed(1) + '%' : '—'}`,
      status: last.twoYStatus,
    },
    {
      n: 4,
      title:  'LTH Accumulation (Exchange Flow)',
      value:  last.exchChange30d != null ? `${last.exchChange30d >= 0 ? '+' : ''}${last.exchChange30d.toFixed(2)}pp` : 'No data',
      sub:    `Exchange supply 30D change (pp). Negative = coins leaving exchanges → cold storage / accumulation. Data available from 2016.`,
      status: last.lthStatus,
    },
  ];

  return (
    <main className="p-6 space-y-6">
      <PageHeader
        title="Bear-Market Bottom Confluence"
        subtitle="Are investor losses, miner capitulation, recent-buyer pain, and long-term-holder accumulation aligning simultaneously?"
      />

      {/* Data note */}
      <div
        className="rounded-lg border px-4 py-3 text-sm"
        style={{ backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)', color: '#93C5FD' }}
      >
        <strong>Methodology:</strong> True on-chain metrics (UTXO-based supply-in-profit, realized cost bands, LTH supply) are paywalled. This page uses free-tier proxies with equivalent directional accuracy: MVRV for supply stress, native HashRate for miner capitulation, 730-day price SMA for 2Y cost basis, and exchange supply flow for LTH behavior. Signals have been back-tested against the 2018, 2020, and 2022 bear market lows.
      </div>

      {/* Confluence score hero */}
      <div
        className="rounded-xl border p-6 flex flex-col items-center gap-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: regime.color + '30' }}
      >
        <p className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          Historical Bottom Confluence Score
        </p>
        <div className="flex items-end gap-2">
          <span className="text-6xl font-bold font-mono leading-none" style={{ color: regime.color }}>
            {last.confluenceScore.toFixed(1)}
          </span>
          <span className="text-2xl font-mono mb-1" style={{ color: 'var(--sct-muted)' }}>/ 4</span>
        </div>

        {/* Score bar */}
        <div className="w-full max-w-xs rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${scorePct}%`, backgroundColor: regime.color }}
          />
        </div>

        <p className="text-base font-semibold" style={{ color: regime.color }}>{regime.label}</p>
        <p className="text-sm text-center max-w-lg" style={{ color: 'var(--sct-muted)' }}>{regime.sublabel}</p>
        <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
          as of {last.time} · BTC {fmtPrice(last.btcClose)}
        </p>
      </div>

      {/* 4 Signal cards */}
      <div>
        <h2 className="text-sm font-medium mb-3 tracking-wide" style={{ color: 'var(--sct-muted)' }}>
          SIGNAL BREAKDOWN
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {signals.map((s) => (
            <SignalRow key={s.n} {...s} />
          ))}
        </div>
      </div>

      {/* Quick stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="BTC Price"
          value={fmtPrice(last.btcClose)}
          source="CoinMetrics"
          freshness="daily"
          accent="#E6EDF3"
        />
        <StatCard
          label="MVRV Ratio"
          value={last.mvrv.toFixed(2)}
          sub={last.mvrv < 1.0 ? 'Below realized price' : last.mvrv < 1.5 ? 'Near cost basis' : 'Profitable'}
          trend={last.mvrv < 1.0 ? 'down' : 'neutral'}
          freshness="daily"
          accent={statusAccent(last.supplyStatus)}
        />
        <StatCard
          label="2Y MA"
          value={last.ma2y != null ? fmtPrice(last.ma2y) : '—'}
          sub={last.priceTo2y != null ? `Price at ${(last.priceTo2y * 100).toFixed(0)}% of 2Y MA` : '—'}
          trend={last.twoYStatus === 'confirmed' ? 'down' : 'neutral'}
          freshness="daily"
          accent={statusAccent(last.twoYStatus)}
        />
        <StatCard
          label="HR Ratio 30/60D"
          value={last.hrRatio != null ? last.hrRatio.toFixed(3) : '—'}
          sub={last.hashStatus === 'confirmed' ? 'Miner capitulation active' : last.hashStatus === 'developing' ? 'Near capitulation' : 'Miners healthy'}
          trend={last.hashStatus === 'confirmed' ? 'down' : 'neutral'}
          freshness="daily"
          accent={statusAccent(last.hashStatus)}
        />
      </div>

      {/* Chart */}
      <BTCBottomConfluenceChartSection
        points={points}
        periods={periods}
        confluenceScore={last.confluenceScore}
        regimeLabel={regime.label}
        regimeColor={regime.color}
        btcClose={last.btcClose}
        mvrv={last.mvrv}
        hrRatio={last.hrRatio}
        priceTo2y={last.priceTo2y}
      />

      {/* Two columns: Signal Timeline + Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Signal timeline */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
            Signal Activation Sequence
          </h3>
          {timeline.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>
              No active signals in the current cycle window.
            </p>
          ) : (
            <ol className="space-y-3">
              {timeline.map((e, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{
                      backgroundColor: statusAccent(e.status) + '22',
                      color: statusAccent(e.status),
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--sct-text)' }}>{e.signal}</p>
                    <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                      {e.date} ·{' '}
                      <span style={{ color: statusAccent(e.status) }}>{statusLabel(e.status)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs mt-4 pt-3 border-t" style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}>
            Each signal typically activates weeks apart. Full confluence rarely lasts more than 3–6 months before recovery begins.
          </p>
        </div>

        {/* What could invalidate */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
            What Could Invalidate This Framework
          </h3>
          <ul className="space-y-3">
            {[
              {
                title: 'Hashrate recovery without price recovery',
                body: 'If miners upgrade efficiency en masse, the hash ribbon could recover even while price continues declining.',
              },
              {
                title: 'Exchange supply rise despite LTH behavior',
                body: 'Institutional adoption changes exchange dynamics — custodial BTC may not show on traditional exchange reserve data.',
              },
              {
                title: 'Structural bear (regulatory shutdown)',
                body: 'A broad regulatory ban or exchange collapse could push all 4 signals to confirmed indefinitely without historical recovery timelines applying.',
              },
              {
                title: 'New MVRV floor for higher adoption cycle',
                body: 'As Bitcoin matures, MVRV may not revisit sub-1.0 levels. Diminishing returns could mean 4/4 confluence becomes increasingly rare or structurally impossible.',
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-2">
                <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FF5C5C' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--sct-text)' }}>{item.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Historical confluence events + forward returns */}
      {events.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3 tracking-wide" style={{ color: 'var(--sct-muted)' }}>
            HISTORICAL CONFLUENCE EVENTS & FORWARD RETURNS
          </h2>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--sct-border)', color: 'var(--sct-muted)' }}>
                  {['Date', 'BTC Price', 'Score', '1-Year Return', '2-Year Return', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => {
                  const r1 = fmtRet(e.ret1y);
                  const r2 = fmtRet(e.ret2y);
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: i < events.length - 1 ? '1px solid var(--sct-border)' : undefined,
                        backgroundColor: e.status === 'current' ? 'rgba(53,208,127,0.04)' : undefined,
                      }}
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--sct-muted)' }}>{e.time}</td>
                      <td className="px-4 py-3 font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>{fmtPrice(e.btcPrice)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: e.score >= 3.5 ? '#35D07F22' : '#E6B45022',
                            color:           e.score >= 3.5 ? '#35D07F'   : '#E6B450',
                          }}
                        >
                          {e.score.toFixed(1)} / 4
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold" style={{ color: r1.color }}>{r1.text}</td>
                      <td className="px-4 py-3 font-mono font-semibold" style={{ color: r2.color }}>{r2.text}</td>
                      <td className="px-4 py-3">
                        {e.status === 'current' ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: '#35D07F22', color: '#35D07F' }}>
                            In Progress
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>Historical</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--sct-muted)' }}>
            Forward returns measured from the date the confluence score first reached ≥ 2.5 / 4. "In Progress" events have no return data yet. Past performance does not guarantee future results.
          </p>
        </div>
      )}

      {/* Interpretation panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: 'Signal 1: MVRV',
            body: 'When the total market cap falls below the aggregate realized price (MVRV < 1), the average BTC holder is sitting at an unrealized loss. This has historically preceded major accumulation phases and marked generational lows.',
            color: statusAccent(last.supplyStatus),
          },
          {
            title: 'Signal 2: Hash Ribbon',
            body: 'When the 30-day hashrate MA falls below the 60-day MA, miners are shutting off machines — a sign they can no longer mine profitably. Miner capitulation historically precedes price bottoms by 1–4 months.',
            color: statusAccent(last.hashStatus),
          },
          {
            title: 'Signal 3: 2Y Cost Basis',
            body: 'The 730-day SMA approximates the average price paid by holders over the last two years. When spot price falls below this line, recent buyers are underwater — a precondition for sustained selling to exhaust and bottom formation to begin.',
            color: statusAccent(last.twoYStatus),
          },
          {
            title: 'Signal 4: LTH Accumulation',
            body: 'Coins moving off exchanges to cold storage represent long-term conviction buying. Exchange supply declines during bear markets have historically coincided with LTH supply increases, supporting price stabilization and eventual recovery.',
            color: statusAccent(last.lthStatus),
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: card.color + '30' }}
          >
            <div
              className="w-1 h-8 rounded-full mb-3"
              style={{ backgroundColor: card.color }}
            />
            <h4 className="text-xs font-semibold mb-2" style={{ color: card.color }}>{card.title}</h4>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{card.body}</p>
          </div>
        ))}
      </div>

      {/* Risk disclaimer */}
      <div
        className="rounded-lg border px-4 py-3 text-xs"
        style={{ borderColor: 'rgba(255,92,92,0.2)', color: 'var(--sct-muted)' }}
      >
        <strong style={{ color: '#FF5C5C' }}>Not financial advice.</strong>{' '}
        This page identifies historical stress-signal alignment, not a buy signal. All four signals confirming simultaneously does not guarantee price recovery — it indicates conditions historically consistent with major bottoms. Markets can remain irrational. Always size positions according to your own risk tolerance.
      </div>
    </main>
  );
}
