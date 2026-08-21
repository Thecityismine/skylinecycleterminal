import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/auth/access';
import { getStoreHealth, type MetricSummary } from '@/lib/store/health';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StoreControls } from '@/components/admin/StoreControls';

// Admin view of the observation store.
//
// The research surfaces still compute live, so this is the only place the stored
// history is visible. Check it before pointing any of them at the store: a
// metric with four rows is not history, and a read path that trusts it would be
// worse than the live fetch it replaced.
//
// Admin only, not merely entitled. The protected layout admits subscribers, so
// the guard here is a second, narrower check.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }) : '—';

export default async function StoreAdminPage() {
  if (!(await isAdmin())) notFound();

  const health = await getStoreHealth();

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Data Store"
        subtitle="Point-in-time history behind the terminal. Nothing reads from it yet."
      />

      <div className="flex flex-col gap-6">
        <StoreControls />

        {health.state === 'needs-index' && (
          <Notice
            tone="amber"
            title="Store not readable yet"
            body={
              "Writes work already. Reading needs the composite indexes in firestore.indexes.json. " +
              "If you have not deployed them, run the command below once. If you have, they are still " +
              "building: Firestore does that in the background and answers this same error until it " +
              "finishes, so wait a minute and refresh."
            }
            command={health.command}
          />
        )}

        {health.state === 'error' && (
          <Notice tone="red" title="Could not read the store" body={health.message} />
        )}

        {health.state === 'ready' && <CoverageTable health={health} />}
      </div>
    </div>
  );
}

// ─── Coverage ─────────────────────────────────────────────────────────────────

function CoverageTable({
  health,
}: {
  health: Extract<Awaited<ReturnType<typeof getStoreHealth>>, { state: 'ready' }>;
}) {
  const report = health.metrics.filter((m) => m.group === 'report');
  const series = health.metrics.filter((m) => m.group === 'series');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Coverage</span>
        <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
          {health.populated} of {health.total} metrics populated
        </span>
      </div>

      <Group
        title="From the daily snapshot"
        note="Written point-in-time, one row per metric per run. These are what a track record can be argued from."
        rows={report}
      />
      <Group
        title="Seeded history"
        note="Backfilled from vendor series. Real data, but not point-in-time."
        rows={series}
      />
    </div>
  );
}

function Group({ title, note, rows }: { title: string; note: string; rows: MetricSummary[] }) {
  if (!rows.length) return null;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--sct-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--sct-secondary)' }}>{title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>{note}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 520 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
              {['Metric', 'Rows', 'First', 'Last'].map((h) => (
                <th
                  key={h}
                  className="text-left py-2 px-4 font-medium text-[10px] tracking-widest uppercase"
                  style={{ color: 'var(--sct-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.metric} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--sct-secondary)' }}>
                  {m.metric}
                </td>
                <td
                  className="py-2.5 px-4 font-mono tabular-nums"
                  style={{ color: m.count > 0 ? 'var(--sct-text)' : 'var(--sct-muted)' }}
                >
                  {m.count > 0 ? m.count.toLocaleString('en-US') : 'empty'}
                </td>
                <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--sct-muted)' }}>
                  {fmtDate(m.first)}
                </td>
                <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--sct-muted)' }}>
                  {fmtDate(m.last)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Notice ───────────────────────────────────────────────────────────────────

function Notice({
  tone, title, body, command,
}: {
  tone: 'amber' | 'red';
  title: string;
  body: string;
  command?: string;
}) {
  const color = tone === 'amber' ? 'var(--sct-amber)' : 'var(--sct-red)';
  const bg = tone === 'amber' ? 'rgba(230,180,80,0.07)' : 'rgba(255,92,92,0.07)';
  const border = tone === 'amber' ? 'rgba(230,180,80,0.25)' : 'rgba(255,92,92,0.25)';

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-2" style={{ backgroundColor: bg, borderColor: border }}>
      <p className="text-xs font-semibold" style={{ color }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>{body}</p>
      {command && (
        <code
          className="text-[11px] font-mono rounded px-2.5 py-1.5 border overflow-x-auto"
          style={{ backgroundColor: 'var(--sct-bg)', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
        >
          {command}
        </code>
      )}
    </div>
  );
}
