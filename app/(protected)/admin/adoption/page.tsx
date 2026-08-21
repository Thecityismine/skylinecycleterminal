import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/auth/access';
import {
  listInitiatives, buildIndexSeries, breakdownByChain, LIVE_STAGE,
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
  const live = initiatives.filter((i) => i.stage >= LIVE_STAGE).length;

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
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Live initiatives" value={live} tone="var(--sct-green)"
              note={`stage ${LIVE_STAGE} or higher`} />
            <Stat label="Tracked" value={initiatives.length} tone="var(--sct-text)"
              note="at any stage" />
            <Stat label="Series points" value={series.length} tone="var(--sct-text)"
              note="dates where something moved" />
          </div>

          <AdoptionEditor initiatives={initiatives} />

          {byChain.length > 0 && <ChainTable rows={byChain} />}
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
