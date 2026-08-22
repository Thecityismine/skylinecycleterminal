"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Check, Loader2, TriangleAlert, Trash2, MessageSquare, Flag, ChevronDown,
} from 'lucide-react';
import {
  THESIS_STATUSES, CONVICTIONS, OPERATORS, statusLabel, utcDate,
  type Thesis, type ThesisEvaluation, type InvalidationRule, type Conviction, type ThesisStatus,
} from '@/lib/theses/schema';

// The register.
//
// Built around one idea: a thesis states in advance what would prove it wrong.
// Everything else here is bookkeeping around that, including keeping the wrong
// ones visible rather than letting them quietly disappear.

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; message: string }
  | { kind: 'done'; message: string }
  | { kind: 'failed'; message: string };

const STATUS_COLOR: Record<ThesisStatus, string> = {
  active:         'var(--sct-blue)',
  invalidated:    'var(--sct-amber)',
  resolved_right: 'var(--sct-green)',
  resolved_wrong: 'var(--sct-red)',
  retired:        'var(--sct-muted)',
};

const EMPTY_RULE: InvalidationRule = {
  id: '', metric: 'cycle_score', operator: 'gt', value: 75, sustainedDays: 14,
};

export function ThesisRegister({
  theses, evaluations, metrics,
}: {
  theses: Thesis[];
  evaluations: ThesisEvaluation[];
  metrics: string[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const post = useCallback(async (payload: Record<string, unknown>, busy: string, done: string) => {
    setStatus({ kind: 'busy', message: busy });
    try {
      const res = await fetch('/api/theses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setStatus({ kind: 'failed', message: json.error ?? `HTTP ${res.status}` });
        return false;
      }
      setStatus({ kind: 'done', message: done });
      router.refresh();
      return true;
    } catch (e) {
      setStatus({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }, [router]);

  const evalFor = (id: string) => evaluations.find((e) => e.thesisId === id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
          Every thesis states what would prove it wrong, before the fact. Rules are checked
          against the observation store each morning.
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors shrink-0"
          style={{
            backgroundColor: open ? 'transparent' : 'rgba(247,147,26,0.12)',
            borderColor: open ? 'var(--sct-border)' : 'rgba(247,147,26,0.35)',
            color: open ? 'var(--sct-secondary)' : 'var(--sct-btc)',
          }}
        >
          {open ? <X size={13} /> : <Plus size={13} />}
          {open ? 'Cancel' : 'New thesis'}
        </button>
      </div>

      <StatusLine status={status} />

      {open && (
        <ThesisForm
          metrics={metrics}
          onSubmit={async (payload) => {
            const ok = await post(payload, 'Saving', `Recorded "${payload.title}"`);
            if (ok) setOpen(false);
          }}
        />
      )}

      {theses.length === 0 ? (
        <div className="rounded-lg border p-6 text-center"
          style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}>
          <p className="text-sm" style={{ color: 'var(--sct-secondary)' }}>No theses recorded.</p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--sct-muted)' }}>
            Start with the view you already hold. A thesis you never wrote down is one you can
            quietly revise after the fact.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {theses.map((t) => (
            <ThesisCard
              key={t.id}
              thesis={t}
              evaluation={evalFor(t.id)}
              expanded={expanded === t.id}
              onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
              onPost={post}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ThesisCard({
  thesis: t, evaluation, expanded, onToggle, onPost,
}: {
  thesis: Thesis;
  evaluation?: ThesisEvaluation;
  expanded: boolean;
  onToggle: () => void;
  onPost: (p: Record<string, unknown>, busy: string, done: string) => Promise<boolean>;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [closing, setClosing] = useState(false);
  const tripped = evaluation?.tripped ?? false;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: 'var(--sct-panel)',
        borderColor: tripped ? 'rgba(230,180,80,0.45)' : 'var(--sct-border)',
      }}
    >
      {tripped && (
        <div className="px-4 py-2 text-xs flex items-center gap-2"
          style={{ backgroundColor: 'rgba(230,180,80,0.1)', color: 'var(--sct-amber)' }}>
          <TriangleAlert size={13} className="shrink-0" />
          An invalidation condition has tripped. This needs a decision.
        </div>
      )}

      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <button onClick={onToggle} className="min-w-0 text-left flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>{t.title}</span>
            <span className="rounded px-2 py-0.5 text-[10px] font-medium border whitespace-nowrap"
              style={{
                backgroundColor: `${STATUS_COLOR[t.status]}18`,
                borderColor: `${STATUS_COLOR[t.status]}40`,
                color: STATUS_COLOR[t.status],
              }}>
              {statusLabel(t.status)}
            </span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
            {t.asset} · {t.conviction} conviction · {t.horizon || 'no horizon'} ·
            {' '}{(t.rules ?? []).length} rule{(t.rules ?? []).length === 1 ? '' : 's'} ·
            {' '}{(t.reviews ?? []).length} review{(t.reviews ?? []).length === 1 ? '' : 's'}
          </span>
        </button>
        <button onClick={onToggle} className="shrink-0 p-1" style={{ color: 'var(--sct-muted)' }}>
          <ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--sct-border)' }}>
          {evaluation && (evaluation.breaches ?? []).length > 0 && (
            <Section title="Invalidation rules">
              <div className="flex flex-col gap-1.5">
                {evaluation.breaches.map((b) => (
                  <div key={b.ruleId} className="text-[11px] font-mono flex flex-wrap items-baseline gap-x-2"
                    style={{ color: b.tripped ? 'var(--sct-amber)' : b.unchecked ? 'var(--sct-muted)' : 'var(--sct-secondary)' }}>
                    <span>{b.description}</span>
                    <span style={{ color: 'var(--sct-muted)' }}>
                      {b.unchecked
                        ? 'no data, unchecked'
                        : `latest ${b.latestValue} on ${b.latestDate} · streak ${b.streak}/${b.required}`}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {t.invalidationNotes && <Section title="Also invalid if"><Prose>{t.invalidationNotes}</Prose></Section>}
          {t.entryContext && <Section title="Written when"><Prose>{t.entryContext}</Prose></Section>}
          {t.bullCase && <Section title="Bull"><Prose>{t.bullCase}</Prose></Section>}
          {t.baseCase && <Section title="Base"><Prose>{t.baseCase}</Prose></Section>}
          {t.bearCase && <Section title="Bear"><Prose>{t.bearCase}</Prose></Section>}
          {(t.catalysts ?? []).length > 0 && <Section title="Catalysts"><Bullets items={t.catalysts} /></Section>}
          {(t.risks ?? []).length > 0 && <Section title="Risks"><Bullets items={t.risks} /></Section>}

          {(t.reviews ?? []).length > 0 && (
            <Section title="Reviews">
              <div className="flex flex-col gap-2">
                {[...t.reviews].reverse().map((r, i) => (
                  <div key={i} className="text-[11px]" style={{ color: 'var(--sct-secondary)' }}>
                    <span className="font-mono" style={{ color: 'var(--sct-muted)' }}>
                      {r.date} · {r.conviction}
                    </span>
                    <span className="block mt-0.5">{r.note}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {t.statusNote && <Section title="Closing note"><Prose>{t.statusNote}</Prose></Section>}

          <div className="flex flex-wrap gap-2">
            <SmallButton icon={MessageSquare} onClick={() => { setReviewing(!reviewing); setClosing(false); }}>
              Review
            </SmallButton>
            <SmallButton icon={Flag} onClick={() => { setClosing(!closing); setReviewing(false); }}>
              Change status
            </SmallButton>
            <SmallButton
              icon={Trash2}
              muted
              onClick={() => {
                if (confirm(`Delete "${t.title}"? Closing it as wrong or retired keeps the record instead.`)) {
                  void onPost({ action: 'delete', id: t.id }, 'Deleting', 'Deleted');
                }
              }}
            >
              Delete
            </SmallButton>
          </div>

          {reviewing && (
            <ReviewForm
              onSubmit={async (note, conviction, date) => {
                const ok = await onPost(
                  { action: 'review', id: t.id, note, conviction, date },
                  'Saving review', 'Review recorded',
                );
                if (ok) setReviewing(false);
              }}
            />
          )}

          {closing && (
            <StatusForm
              current={t.status}
              onSubmit={async (s, note) => {
                const ok = await onPost(
                  { action: 'status', id: t.id, status: s, note },
                  'Updating', `Marked ${statusLabel(s)}`,
                );
                if (ok) setClosing(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── New thesis form ──────────────────────────────────────────────────────────

function ThesisForm({
  metrics, onSubmit,
}: {
  metrics: string[];
  onSubmit: (payload: Record<string, unknown> & { title: string }) => void;
}) {
  const [f, setF] = useState<Record<string, string>>({
    title: '', asset: 'BTC', entryContext: '', horizon: '', conviction: 'medium',
    bullCase: '', baseCase: '', bearCase: '', catalysts: '', risks: '', invalidationNotes: '',
  });
  const [rules, setRules] = useState<InvalidationRule[]>([{ ...EMPTY_RULE, id: 'r1' }]);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const setRule = (i: number, patch: Partial<InvalidationRule>) =>
    setRules((rs) => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-lg border p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" required>
          <Input value={f.title} onChange={(v) => set('title', v)}
            placeholder="Ethereum becomes the settlement layer for tokenized assets" />
        </Field>
        <Field label="Asset"><Input value={f.asset} onChange={(v) => set('asset', v)} placeholder="ETH" /></Field>
        <Field label="Horizon"><Input value={f.horizon} onChange={(v) => set('horizon', v)} placeholder="2 to 4 years" /></Field>
        <Field label="Conviction">
          <Select value={f.conviction} onChange={(v) => set('conviction', v)}
            options={CONVICTIONS.map((c) => ({ value: c, label: c }))} />
        </Field>
      </div>

      <Field label="Written when" hint="Price, score and date, so later you know what you were looking at">
        <Input value={f.entryContext} onChange={(v) => set('entryContext', v)}
          placeholder="BTC 77k, Skyline Score 33, Aug 2026" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Bull"><Input value={f.bullCase} onChange={(v) => set('bullCase', v)} /></Field>
        <Field label="Base"><Input value={f.baseCase} onChange={(v) => set('baseCase', v)} /></Field>
        <Field label="Bear"><Input value={f.bearCase} onChange={(v) => set('bearCase', v)} /></Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Catalysts" hint="One per line"><Area value={f.catalysts} onChange={(v) => set('catalysts', v)} /></Field>
        <Field label="Risks" hint="One per line"><Area value={f.risks} onChange={(v) => set('risks', v)} /></Field>
      </div>

      {/* Invalidation */}
      <div className="rounded-md border p-3 flex flex-col gap-3"
        style={{ borderColor: 'rgba(247,147,26,0.3)', backgroundColor: 'rgba(247,147,26,0.04)' }}>
        <p className="text-[11px] font-medium" style={{ color: 'var(--sct-btc)' }}>
          Invalidation · required
        </p>
        <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
          What would prove this wrong? Rules are checked against the store every morning.
          Anything a metric cannot express goes in the note.
        </p>

        {rules.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-12 items-end">
            <div className="sm:col-span-5">
              <Select value={r.metric} onChange={(v) => setRule(i, { metric: v })}
                options={metrics.map((m) => ({ value: m, label: m }))} />
            </div>
            <div className="sm:col-span-3">
              <Select value={r.operator} onChange={(v) => setRule(i, { operator: v as InvalidationRule['operator'] })}
                options={OPERATORS.map((o) => ({ value: o.key, label: o.label }))} />
            </div>
            <div className="sm:col-span-2">
              <Input value={String(r.value)} onChange={(v) => setRule(i, { value: Number(v) || 0 })} placeholder="75" />
            </div>
            <div className="sm:col-span-2 flex gap-1">
              <Input value={String(r.sustainedDays)} onChange={(v) => setRule(i, { sustainedDays: Number(v) || 1 })} placeholder="days" />
              {rules.length > 1 && (
                <button onClick={() => setRules((rs) => rs.filter((_, n) => n !== i))}
                  className="shrink-0 px-1" style={{ color: 'var(--sct-muted)' }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRules((rs) => [...rs, { ...EMPTY_RULE, id: `r${rs.length + 1}` }])}
            className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--sct-btc)' }}>
            <Plus size={12} /> Add rule
          </button>
          <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
            metric · condition · value · consecutive days
          </span>
        </div>

        <Field label="Also invalid if" hint="Prose, for anything no metric captures">
          <Area value={f.invalidationNotes} onChange={(v) => set('invalidationNotes', v)}
            placeholder="Tokenization migrates decisively off Ethereum, or two consecutive upgrades slip past their stated quarter" />
        </Field>
      </div>

      <div>
        <button
          onClick={() => onSubmit({ ...f, title: f.title, rules })}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border"
          style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: 'rgba(247,147,26,0.35)', color: 'var(--sct-btc)' }}>
          <Plus size={13} /> Record thesis
        </button>
      </div>
    </div>
  );
}

// ─── Small forms ──────────────────────────────────────────────────────────────

function ReviewForm({ onSubmit }: { onSubmit: (note: string, c: Conviction, date: string) => void }) {
  const [note, setNote] = useState('');
  const [conviction, setConviction] = useState<string>('medium');
  const [date, setDate] = useState(utcDate());
  return (
    <div className="rounded-md border p-3 flex flex-col gap-2.5" style={{ borderColor: 'var(--sct-border)' }}>
      <Field label="What changed" required><Area value={note} onChange={setNote} /></Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Conviction now">
          <Select value={conviction} onChange={setConviction}
            options={CONVICTIONS.map((c) => ({ value: c, label: c }))} />
        </Field>
        <Field label="Date"><Input value={date} onChange={setDate} /></Field>
      </div>
      <div>
        <SmallButton icon={Check} onClick={() => onSubmit(note, conviction as Conviction, date)}>
          Save review
        </SmallButton>
      </div>
    </div>
  );
}

function StatusForm({ current, onSubmit }: {
  current: ThesisStatus;
  onSubmit: (s: ThesisStatus, note: string) => void;
}) {
  const [s, setS] = useState<string>(current);
  const [note, setNote] = useState('');
  return (
    <div className="rounded-md border p-3 flex flex-col gap-2.5" style={{ borderColor: 'var(--sct-border)' }}>
      <Field label="Status">
        <div className="flex flex-wrap gap-1.5">
          {THESIS_STATUSES.map((x) => (
            <button key={x.key} onClick={() => setS(x.key)} title={x.note}
              className="rounded px-2.5 py-1 text-[11px] font-medium border transition-colors"
              style={{
                backgroundColor: s === x.key ? `${STATUS_COLOR[x.key]}20` : 'transparent',
                borderColor: s === x.key ? STATUS_COLOR[x.key] : 'var(--sct-border)',
                color: s === x.key ? STATUS_COLOR[x.key] : 'var(--sct-muted)',
              }}>
              {x.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="What happened" required hint="Required when closing. Later you will want to know why">
        <Area value={note} onChange={setNote} />
      </Field>
      <div>
        <SmallButton icon={Check} onClick={() => onSubmit(s as ThesisStatus, note)}>Save status</SmallButton>
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
        {title}
      </span>
      {children}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--sct-secondary)' }}>{children}</p>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((x, i) => (
        <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>· {x}</li>
      ))}
    </ul>
  );
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--sct-secondary)' }}>
        {label}
        {required && <span style={{ color: 'var(--sct-btc)' }}> *</span>}
        {hint && <span className="font-normal" style={{ color: 'var(--sct-muted)' }}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  backgroundColor: 'var(--sct-bg)',
  borderColor: 'var(--sct-border)',
  color: 'var(--sct-text)',
};

function Input({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-md px-3 py-1.5 text-xs border outline-none" style={inputStyle} />
  );
}

function Area({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
      className="w-full rounded-md px-3 py-1.5 text-xs border outline-none resize-y" style={inputStyle} />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md px-3 py-1.5 text-xs border outline-none" style={inputStyle}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SmallButton({ icon: Icon, onClick, muted, children }: {
  icon: React.ElementType; onClick: () => void; muted?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium border transition-colors"
      style={{
        backgroundColor: muted ? 'transparent' : 'rgba(247,147,26,0.1)',
        borderColor: muted ? 'var(--sct-border)' : 'rgba(247,147,26,0.3)',
        color: muted ? 'var(--sct-muted)' : 'var(--sct-btc)',
      }}>
      <Icon size={12} />{children}
    </button>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  const tone = status.kind === 'failed' ? 'var(--sct-red)'
    : status.kind === 'done' ? 'var(--sct-green)' : 'var(--sct-secondary)';
  const Icon = status.kind === 'failed' ? TriangleAlert : status.kind === 'done' ? Check : Loader2;
  return (
    <div className="flex items-start gap-2 text-xs" style={{ color: tone }}>
      <Icon size={13} className={status.kind === 'busy' ? 'animate-spin shrink-0 mt-0.5' : 'shrink-0 mt-0.5'} />
      <span className="leading-relaxed">{status.message}</span>
    </div>
  );
}
