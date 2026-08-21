import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/auth/access';
import {
  listInitiatives, buildIndexSeries, breakdownByChain, breakdownByVerification,
  initiativeWeight, LIVE_STAGE,
  type Initiative,
} from '@/lib/adoption/initiatives';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { AdoptionEditor } from '@/components/admin/AdoptionEditor';

// Institutional Adoption Index, admin surface.
//
// The one dataset in Skyline that nobody sells. Every input is public: press
// releases, SEC filings, regulator announcements. The classified series built
// from them is not, and cannot be subscribed to at any price, which is exactly
// why it is worth the manual effort.
//
// Admin only, and not published yet. A series with four rows is an anecdote.
// It becomes worth showing subscribers somewhere north of a year of history.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export default async function AdoptionAdminPage() {
  if (!(await isAdmin())) notFound();

  let initiatives: Initiative[] = [];
  let error: string | null = null;

  try {
    initiatives = await listInitiatives();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const series = buildIndexSeries(initiatives);
  const byChain = breakdownByChain(initiatives);
  const byVerification = breakdownByVerification(initiatives);
  const live = initiatives.filter((i) => i.stage >= LIVE_STAGE).length;
  const weighted = Math.round(
    initiatives.reduce((sum, i) => sum + initiativeWeight(i.stage, i.verification ?? 'press_only'), 0) * 100,
  ) / 100;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Institutional Adoption"
        subtitle="Who has actually moved on-chain, and how far. Free inputs, proprietary series."
      />

      {error ? (
        <div
          className="rounded-lg border p-4 flex flex-col gap-2"
          style={{ backgroundColor: 'rgba(255,92,92,0.07)', borderColor: 'rgba(255,92,92,0.25)' }}
        >
          <p className="text-xs font-semibold" style={{ color: 'var(--sct-red)' }}>Could not read the index</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>{error}</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            If this is the first run, the collection and its index need deploying:
          </p>
          <code
            className="text-[11px] font-mono rounded px-2.5 py-1.5 border overflow-x-auto"
            style={{ backgroundColor: 'var(--sct-bg)', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
          >
            firebase deploy --only firestore:indexes,firestore:rules
          </code>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Weighted index" value={weighted} tone="var(--sct-btc)"
              note="stage x verification. the number worth charting" />
            <Stat label="Live initiatives" value={live} tone="var(--sct-green)"
              note={`stage ${LIVE_STAGE} or higher`} />
            <Stat label="Tracked" value={initiatives.length} tone="var(--sct-text)"
              note="at any stage" />
            <Stat label="Series points" value={series.length} tone="var(--sct-text)"
              note="dates where something moved" />
          </div>

          <AdoptionEditor initiatives={initiatives} />

          {byVerification.length > 0 && <VerificationTable rows={byVerification} total={weighted} />}
          {byChain.length > 0 && <ChainTable rows={byChain} />}
          <SourcePanel />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note, tone }: {
  label: string; value: number; note: string; tone: string;
}) {
  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums" style={{ color: tone }}>{value}</span>
      <span className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>{note}</span>
    </div>
  );
}

function ChainTable({ rows }: { rows: { chain: string; live: number; total: number }[] }) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--sct-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--sct-secondary)' }}>By settlement chain</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
          Your own count of where institutional activity is actually landing, rather than anyone else&apos;s claim about it.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 380 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
              {['Chain', 'Live', 'Tracked'].map((h) => (
                <th key={h} className="text-left py-2 px-4 font-medium text-[10px] tracking-widest uppercase"
                  style={{ color: 'var(--sct-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.chain} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--sct-secondary)' }}>{r.chain}</td>
                <td className="py-2.5 px-4 font-mono tabular-nums" style={{ color: 'var(--sct-green)' }}>{r.live}</td>
                <td className="py-2.5 px-4 font-mono tabular-nums" style={{ color: 'var(--sct-muted)' }}>{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Evidence quality ─────────────────────────────────────────────────────────

function VerificationTable({
  rows, total,
}: {
  rows: { verification: string; label: string; count: number; weighted: number }[];
  total: number;
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--sct-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--sct-secondary)' }}>By evidence quality</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
          How much of the index rests on something checkable. If most of the weight sits in Press release,
          the index is counting announcements rather than measuring migration.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 420 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
              {['Verification', 'Initiatives', 'Weight', 'Share'].map((h) => (
                <th key={h} className="text-left py-2 px-4 font-medium text-[10px] tracking-widest uppercase"
                  style={{ color: 'var(--sct-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const share = total > 0 ? Math.round((r.weighted / total) * 100) : 0;
              const strong = r.verification.startsWith('onchain');
              return (
                <tr key={r.verification} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                  <td className="py-2.5 px-4" style={{ color: 'var(--sct-secondary)' }}>{r.label}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums" style={{ color: 'var(--sct-muted)' }}>{r.count}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums"
                    style={{ color: strong ? 'var(--sct-green)' : 'var(--sct-amber)' }}>
                    {r.weighted.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums" style={{ color: 'var(--sct-muted)' }}>{share}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Discovery sources ────────────────────────────────────────────────────────
//
// Primary sources and on-chain verification, deliberately not news articles. A
// press write-up is someone else's classification of an event; the issuer page
// and the contract are the event. RWA.xyz sits at the top as discovery: check
// it for what moved, then verify the ones that matter against the issuer.

const SOURCES: { group: string; links: { label: string; url: string; note: string }[] }[] = [
  {
    group: 'Discovery and verification',
    links: [
      { label: 'RWA.xyz tokenized assets', url: 'https://app.rwa.xyz/', note: 'Aggregates AUM, holders, chains and transfers across issuers. Scan here first' },
      { label: 'RWA.xyz treasuries', url: 'https://app.rwa.xyz/treasuries', note: 'BUIDL, BENJI and peers side by side, which is where their numbers are actually checkable' },
    ],
  },
  {
    group: 'Tokenized funds',
    links: [
      { label: 'Franklin BENJI', url: 'https://digitalassets.franklintempleton.com/benji/', note: '1 FOBXX share = 1 BENJI, so supply is independently verifiable on-chain' },
      { label: 'Franklin Templeton', url: 'https://www.franklintempleton.com/', note: 'Issuer root, for filings and announcements' },
      { label: 'BlackRock', url: 'https://www.blackrock.com/', note: 'BUIDL issuer. Geo-redirects, so set your region. Use RWA.xyz for its numbers' },
    ],
  },
  {
    group: 'Bank infrastructure',
    links: [
      { label: 'JPMorgan Kinexys', url: 'https://www.jpmorgan.com/kinexys', note: 'Publishes cumulative and daily transaction volume. Track sub-initiatives separately, not as one row' },
    ],
  },
  {
    group: 'Spot ETFs and digital assets',
    links: [
      { label: 'iShares Bitcoin ETF', url: 'https://www.ishares.com/us/strategies/ways-to-invest-in-bitcoin', note: 'IBIT. Each ETF is its own initiative, not one generic record' },
      { label: 'Fidelity digital assets', url: 'https://institutional.fidelity.com/advisors/investment-solutions/asset-classes/digital-assets', note: 'Institutional products, FBTC and FIDD' },
      { label: 'Bitwise', url: 'https://bitwiseinvestments.com/', note: 'BITB fund documentation' },
    ],
  },
  {
    group: 'Filings',
    links: [
      { label: 'SEC EDGAR full-text search', url: 'https://www.sec.gov/edgar/search/#/q=tokenization', note: 'The primary source under every press release. Change the query to custody, stablecoin, digital assets' },
    ],
  },
];

function SourcePanel() {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--sct-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--sct-secondary)' }}>Where to look</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
          Primary sources and on-chain verification, not news coverage. A write-up is someone else&apos;s
          classification of an event. The issuer page and the contract are the event.
        </p>
      </div>
      <div className="p-4 grid gap-4 sm:grid-cols-2">
        {SOURCES.map((g) => (
          <div key={g.group} className="flex flex-col gap-2">
            <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
              {g.group}
            </p>
            {g.links.map((l) => (
              <div key={l.label} className="flex flex-col">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--sct-btc)' }}
                >
                  {l.label}
                </a>
                <span className="text-[10px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{l.note}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
