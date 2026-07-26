import { buildDeepResearchReport, directionOf } from '@/lib/research/report';
import type { DeepResearchReport } from '@/lib/research/report';
import { CATEGORY_LABEL } from '@/lib/research/evidence';
import type { EvidenceCategory, EvidenceItem } from '@/lib/research/evidence';
import { ReportSection, Meter, Prose } from '@/components/research/ReportSection';
import { PrintReportButton } from '@/components/research/PrintReportButton';

export const dynamic = 'force-dynamic';

const CATEGORY_ORDER: EvidenceCategory[] = [
  'valuation', 'onchain', 'structure', 'sentiment', 'macro', 'timing',
];

function extensionColor(e: number | null): string {
  if (e == null) return 'var(--sct-muted)';
  if (e < 25) return '#3B82F6';
  if (e < 45) return '#35D07F';
  if (e < 60) return '#6B7280';
  if (e < 78) return '#E6B450';
  return '#FF5C5C';
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function IndicatorTable({ items, thesis }: { items: EvidenceItem[]; thesis: DeepResearchReport['thesis'] }) {
  if (!items.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
            {['Indicator', 'Reading', 'Interpretation', 'Position', 'Role'].map((h) => (
              <th key={h} className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--sct-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const dir = directionOf(item, thesis);
            const col = extensionColor(item.extension);
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--sct-secondary)' }}>{item.label}</td>
                <td className="py-2.5 pr-4 font-mono" style={{ color: 'rgba(230,237,243,0.8)' }}>{item.reading}</td>
                <td className="py-2.5 pr-4" style={{ color: 'var(--sct-muted)' }}>
                  {item.available ? item.interpretation : (item.gapReason ?? 'Unavailable')}
                </td>
                <td className="py-2.5 pr-4 font-mono" style={{ color: col }}>
                  {item.extension != null ? Math.round(item.extension) : '—'}
                </td>
                <td className="py-2.5 pr-4">
                  {!item.available ? (
                    <span style={{ color: 'var(--sct-muted)' }}>excluded</span>
                  ) : dir === 'supports' ? (
                    <span style={{ color: '#35D07F' }}>supports</span>
                  ) : dir === 'weakens' ? (
                    <span style={{ color: '#FF5C5C' }}>weakens</span>
                  ) : (
                    <span style={{ color: 'var(--sct-muted)' }}>neutral</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function DeepResearchPage() {
  let report: DeepResearchReport | null = null;
  try {
    report = await buildDeepResearchReport();
  } catch {
    report = null;
  }

  if (!report) {
    return (
      <div className="max-w-[1100px] mx-auto py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>
          Unable to assemble the research report — upstream data sources are unreachable.
        </p>
      </div>
    );
  }

  const r = report;

  return (
    <div className="max-w-[1100px] mx-auto space-y-5 report-root">

      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <header
        className="rounded-xl border p-6 report-section"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: 'var(--sct-muted)' }}>
              Skyline Deep Research
            </p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: 'var(--sct-text)' }}>
              Bitcoin Cycle Report
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
              Data as of {fmtDate(r.asOfDate)}
              {r.btcPrice != null && ` · BTC ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(r.btcPrice)}`}
            </p>
          </div>
          <PrintReportButton />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Skyline Cycle Score', value: `${Math.round(r.cycleScore)} / 100`, sub: r.zoneLabel, color: r.zoneColor },
            { label: 'Current Regime',      value: r.thesisLabel, sub: `Weighted across ${r.ledger.available.length} indicators`, color: extensionColor(r.ledger.weightedExtension) },
            { label: 'Evidence Confidence', value: `${r.confidence}%`, sub: `${Math.round(r.ledger.coverage * 100)}% data coverage`, color: 'var(--sct-secondary)' },
            { label: 'Risk Level',          value: r.riskLevel, sub: `Market health ${r.marketHealth} / 10`, color: extensionColor(r.ledger.weightedExtension) },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>{s.label}</p>
              <p className="text-xl font-mono font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ── Executive summary ────────────────────────────────────────────── */}
      <ReportSection title="Executive Summary">
        <Prose>{r.executiveSummary}</Prose>
      </ReportSection>

      {/* ── Why this conclusion ──────────────────────────────────────────── */}
      <ReportSection
        title="Why This Conclusion"
        subtitle="Every indicator that moved the reading, and every one that argues against it. Nothing here is hidden behind a model."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#35D07F' }}>
              Evidence supporting the current reading ({r.supporting.length})
            </p>
            <ul className="space-y-1.5">
              {r.supporting.map((i) => (
                <li key={i.id} className="text-xs flex gap-2" style={{ color: 'var(--sct-muted)' }}>
                  <span style={{ color: '#35D07F' }}>▲</span>
                  <span><strong style={{ color: 'var(--sct-secondary)' }}>{i.label}</strong> — {i.reading}. {i.interpretation}.</span>
                </li>
              ))}
              {!r.supporting.length && <li className="text-xs" style={{ color: 'var(--sct-muted)' }}>None.</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#FF5C5C' }}>
              Evidence weakening it ({r.weakening.length})
            </p>
            <ul className="space-y-1.5">
              {r.weakening.map((i) => (
                <li key={i.id} className="text-xs flex gap-2" style={{ color: 'var(--sct-muted)' }}>
                  <span style={{ color: '#FF5C5C' }}>▼</span>
                  <span><strong style={{ color: 'var(--sct-secondary)' }}>{i.label}</strong> — {i.reading}. {i.interpretation}.</span>
                </li>
              ))}
              {!r.weakening.length && <li className="text-xs" style={{ color: 'var(--sct-muted)' }}>None.</li>}
            </ul>
          </div>
        </div>
      </ReportSection>

      {/* ── What the data suggests ───────────────────────────────────────── */}
      <ReportSection title="What the Data Suggests">
        <Prose>{r.whatTheDataSuggests}</Prose>
      </ReportSection>

      {/* ── Indicator dashboard by category ──────────────────────────────── */}
      <ReportSection
        title="Indicator Dashboard"
        subtitle="Position runs 0 (deepest historical value) to 100 (most extended). Excluded rows contributed to no figure in this report."
      >
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const items = r.ledger.items.filter((i) => i.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--sct-secondary)' }}>
                  {CATEGORY_LABEL[cat]}
                </p>
                <IndicatorTable items={items} thesis={r.thesis} />
              </div>
            );
          })}
        </div>
      </ReportSection>

      {/* ── Historical comparison ────────────────────────────────────────── */}
      <ReportSection
        title="Historical Cycle Comparison"
        subtitle="Weeks elapsed from the cycle high to the eventual low, for every completed cycle."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {r.cycleComparison.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border p-3"
              style={{
                borderColor: c.isCurrent ? '#3B82F6' : 'var(--sct-border)',
                backgroundColor: c.isCurrent ? 'rgba(59,130,246,0.07)' : 'transparent',
              }}
            >
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>{c.label}</p>
              <p className="text-lg font-mono font-bold mt-1" style={{ color: c.isCurrent ? '#3B82F6' : 'var(--sct-secondary)' }}>
                {c.weeks != null ? `Week ${c.weeks}` : '—'}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>{c.note}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* ── Risk assessment + probabilities ──────────────────────────────── */}
      <ReportSection
        title="Positional Weights"
        subtitle="Derived from where the measured indicators sit in their own history — these are not forecasts, and no figure here models future price."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs mb-3" style={{ color: 'var(--sct-secondary)' }}>
              Closer to a cycle low than a cycle high
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-mono font-bold" style={{ color: '#3B82F6' }}>{r.bottomProbability}%</span>
              <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>vs {100 - r.bottomProbability}% closer to a high</span>
            </div>
            <Meter value={r.bottomProbability} color="#3B82F6" />
            <p className="text-[10px] mt-2" style={{ color: 'var(--sct-muted)' }}>
              75% indicator positioning + 25% cycle timing. Clamped to 5–95% because no indicator set justifies certainty.
            </p>
          </div>

          <div>
            <p className="text-xs mb-3" style={{ color: 'var(--sct-secondary)' }}>Regime weighting</p>
            <div className="space-y-2.5">
              {[
                { label: 'Accumulation', value: r.probabilities.accumulation, color: '#3B82F6' },
                { label: 'Neutral',      value: r.probabilities.neutral,      color: '#6B7280' },
                { label: 'Distribution', value: r.probabilities.distribution, color: '#FF5C5C' },
              ].map((p) => (
                <div key={p.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span style={{ color: 'var(--sct-muted)' }}>{p.label}</span>
                    <span className="font-mono" style={{ color: p.color }}>{p.value}%</span>
                  </div>
                  <Meter value={p.value} color={p.color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </ReportSection>

      {/* ── What changed ─────────────────────────────────────────────────── */}
      {r.whatChanged.length > 0 && (
        <ReportSection title="What Changed This Week" subtitle="Same series, read seven days apart.">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
                  {['Metric', '7 Days Ago', 'Now', 'Change'].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--sct-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.whatChanged.map((c) => (
                  <tr key={c.label} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                    <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--sct-secondary)' }}>{c.label}</td>
                    <td className="py-2.5 pr-4 font-mono" style={{ color: 'var(--sct-muted)' }}>{c.from}</td>
                    <td className="py-2.5 pr-4 font-mono" style={{ color: 'rgba(230,237,243,0.85)' }}>{c.to}</td>
                    <td
                      className="py-2.5 pr-4 font-mono"
                      style={{
                        color: c.favourable == null ? 'var(--sct-muted)'
                          : c.favourable ? '#35D07F' : '#FF5C5C',
                      }}
                    >
                      {c.direction === 'up' ? '▲' : c.direction === 'down' ? '▼' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}

      {/* ── Similar historical period ────────────────────────────────────── */}
      {r.similarPeriod && (
        <ReportSection
          title="Most Similar Historical Period"
          subtitle="Nearest match across price vs realized, price vs delta, price vs 200W MA, and drawdown. Restricted to dates at least two years old, so the outcome is already known."
        >
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Closest match</p>
              <p className="text-xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{r.similarPeriod.label}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Similarity</p>
              <p className="text-xl font-mono font-bold" style={{ color: '#3B82F6' }}>{r.similarPeriod.confidence}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>BTC then</p>
              <p className="text-xl font-mono font-bold" style={{ color: 'var(--sct-secondary)' }}>{r.similarPeriod.price}</p>
            </div>
          </div>
          <Prose>{r.similarPeriod.outcome} Similarity of conditions is not a prediction of a repeat.</Prose>
        </ReportSection>
      )}

      {/* ── Key takeaways ────────────────────────────────────────────────── */}
      <ReportSection title="Key Takeaways">
        <ul className="space-y-2">
          {r.keyTakeaways.map((t, i) => (
            <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--sct-secondary)' }}>
              <span style={{ color: 'var(--sct-muted)' }}>•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </ReportSection>

      {/* ── Outlook ──────────────────────────────────────────────────────── */}
      <ReportSection title="Outlook">
        <Prose>{r.outlook}</Prose>
      </ReportSection>

      {/* ── Contrarian risks ─────────────────────────────────────────────── */}
      <ReportSection
        title="What Would Invalidate This"
        subtitle="Every report should be able to say what it would take to be wrong."
      >
        <ul className="space-y-2">
          {r.contrarianRisks.map((risk, i) => (
            <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--sct-secondary)' }}>
              <span style={{ color: '#E6B450' }}>!</span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      </ReportSection>

      {/* ── Data gaps ────────────────────────────────────────────────────── */}
      {r.dataGaps.length > 0 && (
        <ReportSection
          title="Data Gaps"
          subtitle="Tracked but unavailable for this report. None of these contributed to any figure above."
        >
          <ul className="space-y-1.5">
            {r.dataGaps.map((g) => (
              <li key={g.id} className="text-xs flex gap-2" style={{ color: 'var(--sct-muted)' }}>
                <span>—</span>
                <span>
                  <strong style={{ color: 'var(--sct-secondary)' }}>{g.label}</strong>
                  {g.gapReason ? `: ${g.gapReason}` : ''} <span style={{ opacity: 0.7 }}>({g.source})</span>
                </span>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="text-[10px] leading-relaxed pb-8 report-section" style={{ color: 'var(--sct-muted)' }}>
        <p>
          Skyline Deep Research · generated {new Date(r.generatedAt).toLocaleString('en-US')} · narrative engine <span className="font-mono">{r.composerId}</span>.
        </p>
        <p className="mt-1">
          Every figure in this report is computed from the sources named beside it. Positional weights describe where measured
          indicators sit within their own recorded history; they are not forecasts and do not model future price. Four completed
          Bitcoin cycles is a small sample. This is not financial advice.
        </p>
      </footer>
    </div>
  );
}
