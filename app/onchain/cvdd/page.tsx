import { fetchBTCMVRVData } from '@/lib/api/coinmetrics';
import {
  buildValueFloorPoints,
  getFloorProximityScore,
  FLOOR_EVENTS,
} from '@/lib/indicators/valueFloors';
import { BTCValueFloorChartSection } from '@/components/charts/BTCValueFloorChartSection';
import { PageHeader }         from '@/components/dashboard/PageHeader';
import { StatCard }           from '@/components/dashboard/StatCard';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtMult(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}×`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function distColor(v: number | null | undefined): string {
  if (v == null) return 'var(--sct-muted)';
  if (v < 0)   return '#35D07F';
  if (v < 50)  return '#3B82F6';
  if (v < 150) return '#E6B450';
  return '#FF5C5C';
}

// ─── Historical reference table ────────────────────────────────────────────────

const CYCLE_SNAPSHOTS = [
  { period: '2011 Cycle Low', date: 'Nov 2011', btcPrice: '$2',      vsCostBasis: 'Below', regime: 'Deep Value', color: '#3B82F6' },
  { period: '2015 Bear Low',  date: 'Jan 2015', btcPrice: '$175',    vsCostBasis: '0–20%', regime: 'Deep Value', color: '#3B82F6' },
  { period: '2018 Bear Low',  date: 'Dec 2018', btcPrice: '$3,122',  vsCostBasis: '~20%',  regime: 'Deep Value', color: '#3B82F6' },
  { period: 'COVID Crash',    date: 'Mar 2020', btcPrice: '$3,858',  vsCostBasis: '~5%',   regime: 'Approaching', color: '#35D07F' },
  { period: '2022 Bear Low',  date: 'Nov 2022', btcPrice: '$15,476', vsCostBasis: '~-15%', regime: 'Deep Value', color: '#3B82F6' },
  { period: '2024 ATH',       date: 'Mar 2024', btcPrice: '$73,737', vsCostBasis: '~280%', regime: 'Extended',   color: '#FF5C5C' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CVDDPage() {
  const points = await (async () => {
    try {
      const raw = await fetchBTCMVRVData('2011-01-01');
      return buildValueFloorPoints(raw);
    } catch {
      return [];
    }
  })();

  const last  = points.length > 0 ? points[points.length - 1] : null;
  const score = getFloorProximityScore(points);

  const pageRegime = score.score >= 80 ? 'accumulate'
    : score.score >= 60 ? 'neutral'
    : score.score >= 20 ? 'caution'
    : 'distribution';

  const vsRealized  = last?.vsRealized  != null ? (last.vsRealized  - 1) * 100 : null;
  const vs200w      = last?.vs200w      != null ? (last.vs200w      - 1) * 100 : null;
  const vs2y        = last?.vs2y        != null ? (last.vs2y        - 1) * 100 : null;
  const vsPowerLaw  = last != null ? (last.vsPowerLaw - 1) * 100 : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Bitcoin Value Floor Model"
        subtitle="Long-term on-chain value reference floors — realized price, moving averages, and power law"
        regime={pageRegime}
      />

      {/* ── Methodology note ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{ backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }}
      >
        <span className="text-blue-400 text-base shrink-0">ⓘ</span>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(147,197,253,0.9)' }}>
          <strong>CVDD Alternative:</strong> True CVDD (Cumulative Value Days Destroyed) requires daily Coin Days Destroyed (CDD) data, which is paywalled across all on-chain providers including CoinMetrics, Glassnode, and Blockchain.info.
          This page answers the same question — <em>is Bitcoin near historically depressed valuation territory?</em> — using four free-tier metrics:
          <strong> Realized Price</strong> (aggregate holder cost basis via MVRV), <strong>200W MA</strong>, <strong>2Y MA</strong>, and <strong>Power Law</strong> central value.
          All four have historically converged near major bear-market lows, providing equivalent floor reference signals to CVDD.
        </p>
      </div>

      {/* ── Floor proximity score banner ───────────────────────────────────── */}
      <div
        className="rounded-xl border px-5 py-4 flex items-center gap-4"
        style={{
          backgroundColor: `${score.color}10`,
          borderColor:     `${score.color}35`,
        }}
      >
        <div
          className="text-4xl font-mono font-bold shrink-0"
          style={{ color: score.color }}
        >
          {score.score}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: score.color }}>
            Floor Proximity Score — {score.label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{score.description}</p>
        </div>
      </div>

      {/* ── Primary stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="BTC Price"
          value={fmtUSD(last?.btcClose)}
          sub="Current"
          accent="rgba(230,237,243,0.85)"
        />
        <StatCard
          label="Realized Price"
          value={fmtUSD(last?.realizedPrice)}
          sub="Aggregate holder cost basis"
          accent="#3B82F6"
        />
        <StatCard
          label="vs Realized Price"
          value={vsRealized != null ? fmtPct(vsRealized) : '—'}
          sub={vsRealized != null
            ? vsRealized < 0 ? 'Below cost basis — deep value' : 'Above aggregate cost basis'
            : ''}
          accent={distColor(vsRealized)}
        />
        <StatCard
          label="Floor Proximity"
          value={`${score.score} / 100`}
          sub={score.label}
          accent={score.color}
        />
        <StatCard
          label="ATH Drawdown"
          value={last ? `${last.drawdownPct.toFixed(1)}%` : '—'}
          sub={last ? `ATH: ${fmtUSD(last.ath)}` : ''}
          accent={last?.drawdownPct != null
            ? last.drawdownPct < -50 ? '#35D07F'
            : last.drawdownPct < -30 ? '#3B82F6'
            : last.drawdownPct < -20 ? '#E6B450'
            : '#FF5C5C'
            : 'var(--sct-muted)'}
        />
      </div>

      {/* ── Secondary distance cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="200W MA"
          value={fmtUSD(last?.ma200w)}
          sub={vs200w != null ? `${fmtPct(vs200w)} above` : 'Calculating…'}
          accent="#A855F7"
        />
        <StatCard
          label="vs 200W MA"
          value={last?.vs200w != null ? fmtMult(last.vs200w) : '—'}
          sub="Price / 200-week moving average"
          accent={distColor(vs200w)}
        />
        <StatCard
          label="2-Year MA"
          value={fmtUSD(last?.ma2y)}
          sub={vs2y != null ? `${fmtPct(vs2y)} above` : 'Calculating…'}
          accent="#35D07F"
        />
        <StatCard
          label="vs Power Law"
          value={last?.vsPowerLaw != null ? fmtMult(last.vsPowerLaw) : '—'}
          sub={vsPowerLaw != null ? `${fmtPct(vsPowerLaw)} vs central value` : ''}
          accent={distColor(vsPowerLaw)}
        />
      </div>

      {/* ── Main chart ────────────────────────────────────────────────────── */}
      <BTCValueFloorChartSection
        points={points}
        scoreScore={score.score}
        scoreLabel={score.label}
        scoreColor={score.color}
        btcClose={last?.btcClose ?? null}
        realizedPrice={last?.realizedPrice ?? null}
        vsRealizedPct={vsRealized}
        drawdownPct={last?.drawdownPct ?? null}
      />

      {/* ── Score breakdown + zone guide ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Score panel */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Floor Proximity Score Breakdown
          </p>

          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-5xl font-mono font-bold" style={{ color: score.color }}>{score.score}</span>
            <span className="text-sm font-medium" style={{ color: score.color }}>{score.label}</span>
          </div>

          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--sct-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score.score}%`, backgroundColor: score.color }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono mb-4" style={{ color: 'var(--sct-muted)' }}>
            <span style={{ color: '#FF5C5C' }}>0 — Extended</span>
            <span style={{ color: '#E6B450' }}>20</span>
            <span style={{ color: '#6B7280' }}>40</span>
            <span style={{ color: '#35D07F' }}>60</span>
            <span style={{ color: '#3B82F6' }}>80 — Deep Value</span>
            <span>100</span>
          </div>

          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--sct-muted)' }}>
            {score.description}
          </p>

          <div className="space-y-2">
            {[
              { label: 'vs Realized Price (50%)', value: score.breakdown.realizedFloor },
              { label: 'vs 200W MA (20%)',        value: score.breakdown.ma200wFloor },
              { label: 'vs 2Y MA (15%)',           value: score.breakdown.ma2yFloor },
              { label: 'ATH Drawdown (15%)',        value: score.breakdown.drawdown },
            ].map((c) => {
              const col = c.value >= 80 ? '#3B82F6' : c.value >= 60 ? '#35D07F' : c.value >= 40 ? '#6B7280' : c.value >= 20 ? '#E6B450' : '#FF5C5C';
              return (
                <div key={c.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>{c.label}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: col }}>{Math.round(c.value)}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${c.value}%`, backgroundColor: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zone guide */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Zone Reference Guide
          </p>
          <div className="space-y-3">
            {[
              { range: '80–100', label: 'Historical Bottom Zone',  color: '#3B82F6', desc: 'Price near or below multiple historical value floors. All major bear lows 2015–2022 fell here.' },
              { range: '60–80',  label: 'Approaching Deep Value',  color: '#35D07F', desc: 'Price meaningfully below long-term averages. Often seen in later stages of bear markets.' },
              { range: '40–60',  label: 'Pullback / Neutral',      color: '#6B7280', desc: 'Normal mid-cycle range. Price is neither historically cheap nor historically expensive.' },
              { range: '20–40',  label: 'Normal Expansion',        color: '#E6B450', desc: 'Healthy bull market. Price extended above cost basis but not at speculative extremes.' },
              { range: '0–20',   label: 'Far Above Value Floors',  color: '#FF5C5C', desc: 'Price far above all reference floors. Historically preceded cycle peaks (2017, 2021).' },
            ].map((z) => (
              <div key={z.range} className="flex gap-3">
                <div>
                  <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded border" style={{ color: z.color, borderColor: z.color + '40', backgroundColor: z.color + '12' }}>
                    {z.range}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: z.color }}>{z.label}</p>
                  <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{z.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Historical cycle reference ─────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
          Historical Cycle Reference — Floor Proximity at Key Dates
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
                {['Period', 'Date', 'BTC Price', 'vs Realized Price', 'Zone', ''].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--sct-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CYCLE_SNAPSHOTS.map((r) => (
                <tr key={r.period} style={{ borderBottom: '1px solid var(--sct-border)' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--sct-secondary)' }}>{r.period}</td>
                  <td className="py-2.5 pr-4 font-mono"   style={{ color: 'var(--sct-muted)' }}>{r.date}</td>
                  <td className="py-2.5 pr-4 font-mono"   style={{ color: 'rgba(230,237,243,0.8)' }}>{r.btcPrice}</td>
                  <td className="py-2.5 pr-4 font-mono"   style={{ color: '#3B82F6' }}>{r.vsCostBasis}</td>
                  <td className="py-2.5 pr-4 font-medium" style={{ color: r.color }}>{r.regime}</td>
                  <td className="py-2.5">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: r.color }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-3" style={{ color: 'var(--sct-muted)' }}>
          &ldquo;vs Realized Price&rdquo; shows approximate % above/below aggregate holder cost basis at that date. Bear lows historically occur when BTC trades near or below this level.
        </p>
      </div>

      {/* ── Interpretation panel ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Realized Price Floor',
            color: '#3B82F6',
            content: 'The realized price is the average cost basis of all Bitcoin holders — what they paid when their coins last moved. Trading near or below this level means most holders are at breakeven or a loss. All major bear-market lows (2015, 2018, 2022) have touched this floor.',
          },
          {
            label: '200W MA Support',
            color: '#A855F7',
            content: 'The 200-week moving average has historically acted as strong bear-market support. Bitcoin has only traded below it briefly at capitulation events. When price returns to this level, it often signals late-stage bear market conditions.',
          },
          {
            label: 'Power Law Floor',
            color: '#E6B450',
            content: 'Bitcoin follows a long-term logarithmic growth trend. The power law central value represents the mathematical middle of this trend. The lower support band (½× central) has only been breached at Bitcoin\'s most extreme historical lows.',
          },
          {
            label: 'Model Limitations',
            color: '#6B7280',
            content: 'Value floors are reference lines, not precise buy signals. Each cycle produces different multiples. These models measure where price is relative to on-chain cost basis and long-term trends — they do not predict when or whether a bottom will form.',
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
