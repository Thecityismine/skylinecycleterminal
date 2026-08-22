import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/auth/access';
import { listTheses, evaluateActiveTheses, trackRecord, type Thesis, type ThesisEvaluation } from '@/lib/theses/theses';
import { listKnownMetrics } from '@/lib/store/observations';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ThesisRegister } from '@/components/admin/ThesisRegister';

// The thesis register.
//
// Most analysts make calls and quietly forget the ones that age badly. This is
// the structural fix: invalidation criteria written before the fact, checked
// every morning against the observation store, and the wrong ones kept visible.
//
// The hit rate deliberately excludes invalidated theses. A pre-registered
// condition tripping is the process working, not a failed call, and counting it
// as a miss would punish exactly the discipline the register exists to create.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function ThesesPage() {
  if (!(await isAdmin())) notFound();

  let theses: Thesis[] = [];
  let evaluations: ThesisEvaluation[] = [];
  let metrics: string[] = [];
  let error: string | null = null;

  try {
    theses = await listTheses();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  // Both are conveniences and fail quietly. A store that cannot be read should
  // not take down the register, it should just mean rules show as unchecked.
  try { evaluations = await evaluateActiveTheses(); } catch { evaluations = []; }
  try { metrics = await listKnownMetrics(); } catch { metrics = []; }

  if (!metrics.length) metrics = ['cycle_score', 'btc_price_usd', 'weighted_extension', 'fear_greed'];
  metrics.sort();

  const record = trackRecord(theses);
  const tripped = evaluations.filter((e) => e.tripped).length;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Thesis Register"
        subtitle="What you said, when you said it, and what would prove it wrong."
      />

      {error ? (
        <div className="rounded-lg border p-4 flex flex-col gap-2"
          style={{ backgroundColor: 'rgba(255,92,92,0.07)', borderColor: 'rgba(255,92,92,0.25)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--sct-red)' }}>Could not read the register</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>{error}</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            If this is the first run, deploy the rules and indexes:
          </p>
          <code className="text-[11px] font-mono rounded px-2.5 py-1.5 border overflow-x-auto"
            style={{ backgroundColor: 'var(--sct-bg)', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}>
            firebase deploy --only firestore:indexes,firestore:rules
          </code>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat label="Open" value={String(record.active)} tone="var(--sct-blue)" note="being tracked" />
            <Stat
              label="Needs a decision"
              value={String(tripped)}
              tone={tripped > 0 ? 'var(--sct-amber)' : 'var(--sct-muted)'}
              note="rule tripped"
            />
            <Stat
              label="Hit rate"
              value={record.hitRate == null ? '—' : `${record.hitRate}%`}
              tone="var(--sct-text)"
              note={record.hitRate == null ? 'nothing resolved yet' : `${record.right} right, ${record.wrong} wrong`}
            />
            <Stat
              label="Invalidated"
              value={String(record.invalidated)}
              tone="var(--sct-secondary)"
              note="excluded from hit rate"
            />
          </div>

          <ThesisRegister theses={theses} evaluations={evaluations} metrics={metrics} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note, tone }: {
  label: string; value: string; note: string; tone: string;
}) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums" style={{ color: tone }}>{value}</span>
      <span className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>{note}</span>
    </div>
  );
}
