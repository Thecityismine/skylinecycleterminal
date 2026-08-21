"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Check, TriangleAlert, ArrowUpRight, Trash2, X, Pencil } from 'lucide-react';
import {
  STAGES, INSTITUTION_TYPES, CATEGORIES, VERIFICATIONS, LIVE_STAGE, utcDate,
  initiativeWeight, verificationLabel,
  type Initiative, type Stage,
} from '@/lib/adoption/schema';

// Entry surface for the Institutional Adoption Index.
//
// A form rather than a pipeline, on purpose. Deciding whether an announcement
// is a pilot or a production launch is judgement, and that judgement is the
// thing the resulting series is worth money for. The job here is to make
// recording that judgement fast enough that it actually happens.

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; message: string }
  | { kind: 'done'; message: string }
  | { kind: 'failed'; message: string };

const STAGE_COLOR: Record<number, string> = {
  0: 'var(--sct-muted)',
  1: 'var(--sct-muted)',
  2: 'var(--sct-blue)',
  3: 'var(--sct-amber)',
  4: 'var(--sct-green)',
  5: 'var(--sct-green)',
};

const EMPTY = {
  institution: '', institutionType: 'bank', name: '', category: 'tokenization',
  program: '', verification: 'press_only', observableMetric: '',
  chain: '', asset: '', partner: '', country: '', valueUsd: '', summary: '',
  initialStage: 2, initialDate: utcDate(), sourceUrl: '', note: '',
};

export function AdoptionEditor({ initiatives }: { initiatives: Initiative[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string | number>>({ ...EMPTY });
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [promoting, setPromoting] = useState<Initiative | null>(null);
  const [editing, setEditing] = useState<Initiative | null>(null);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const post = useCallback(async (payload: Record<string, unknown>, busy: string, done: string) => {
    setStatus({ kind: 'busy', message: busy });
    try {
      const res = await fetch('/api/adoption', {
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

  const submitNew = useCallback(async () => {
    const ok = await post(
      { action: 'create', ...form, initialStage: Number(form.initialStage) },
      'Saving',
      `Added ${form.institution} · ${form.name}`,
    );
    if (ok) { setForm({ ...EMPTY }); setOpen(false); }
  }, [form, post]);

  const liveCount = initiatives.filter((i) => i.stage >= LIVE_STAGE).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary + add */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            {initiatives.length} tracked
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--sct-green)' }}>
            {liveCount} live
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
            live means stage {LIVE_STAGE} or higher
          </span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors"
          style={{
            backgroundColor: open ? 'transparent' : 'rgba(247,147,26,0.12)',
            borderColor: open ? 'var(--sct-border)' : 'rgba(247,147,26,0.35)',
            color: open ? 'var(--sct-secondary)' : 'var(--sct-btc)',
          }}
        >
          {open ? <X size={13} /> : <Plus size={13} />}
          {open ? 'Cancel' : 'Add initiative'}
        </button>
      </div>

      <StatusLine status={status} />

      {/* New initiative form */}
      {open && (
        <div
          className="rounded-lg border p-5 flex flex-col gap-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Institution" required>
              <Input value={form.institution} onChange={(v) => set('institution', v)} placeholder="BlackRock" />
            </Field>
            <Field label="Initiative name" required>
              <Input value={form.name} onChange={(v) => set('name', v)} placeholder="BUIDL" />
            </Field>
            <Field label="Institution type">
              <Select value={form.institutionType} onChange={(v) => set('institutionType', v)}
                options={INSTITUTION_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') }))} />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(v) => set('category', v)}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            </Field>
            <Field label="Programme" hint="Parent banner, e.g. Kinexys. Leave blank if standalone">
              <Input value={form.program} onChange={(v) => set('program', v)} placeholder="Kinexys" />
            </Field>
            <Field label="Observable metric" hint="What you can independently measure">
              <Input value={form.observableMetric} onChange={(v) => set('observableMetric', v)}
                placeholder="AUM, supply, holders" />
            </Field>
            <Field label="Chain" hint="Tests where tokenization is actually landing">
              <Input value={form.chain} onChange={(v) => set('chain', v)} placeholder="ethereum" />
            </Field>
            <Field label="Asset">
              <Input value={form.asset} onChange={(v) => set('asset', v)} placeholder="US Treasuries" />
            </Field>
            <Field label="Partner">
              <Input value={form.partner} onChange={(v) => set('partner', v)} placeholder="Securitize" />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(v) => set('country', v)} placeholder="USA" />
            </Field>
            <Field label="Value USD" hint="AUM or committed capital, if stated">
              <Input value={form.valueUsd} onChange={(v) => set('valueUsd', v)} placeholder="2900000000" />
            </Field>
            <Field label="Date reached" required hint="When it happened, not today">
              <Input value={form.initialDate} onChange={(v) => set('initialDate', v)} placeholder="2024-03-20" />
            </Field>
          </div>

          <Field label="Stage" required>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => set('initialStage', s.value)}
                  title={s.note}
                  className="rounded px-2.5 py-1 text-[11px] font-medium border transition-colors"
                  style={{
                    backgroundColor: Number(form.initialStage) === s.value ? `${STAGE_COLOR[s.value]}20` : 'transparent',
                    borderColor: Number(form.initialStage) === s.value ? STAGE_COLOR[s.value] : 'var(--sct-border)',
                    color: Number(form.initialStage) === s.value ? STAGE_COLOR[s.value] : 'var(--sct-muted)',
                  }}
                >
                  {s.value} {s.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Verification" required hint="How much of the claim can be checked without the issuer">
            <div className="flex flex-wrap gap-1.5">
              {VERIFICATIONS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => set('verification', v.key)}
                  title={v.note}
                  className="rounded px-2.5 py-1 text-[11px] font-medium border transition-colors"
                  style={{
                    backgroundColor: form.verification === v.key ? 'rgba(247,147,26,0.16)' : 'transparent',
                    borderColor: form.verification === v.key ? 'rgba(247,147,26,0.45)' : 'var(--sct-border)',
                    color: form.verification === v.key ? 'var(--sct-btc)' : 'var(--sct-muted)',
                  }}
                >
                  {v.label}
                  <span className="ml-1 font-mono opacity-60">{v.weight.toFixed(1)}</span>
                </button>
              ))}
            </div>
          </Field>

          <p className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
            Contributes{' '}
            <span style={{ color: 'var(--sct-btc)' }}>
              {initiativeWeight(
                Number(form.initialStage) as Stage,
                form.verification as (typeof VERIFICATIONS)[number]['key'],
              ).toFixed(2)}
            </span>{' '}
            to the weighted index
          </p>

          <Field label="Summary" required hint="One line, plain language">
            <Input value={form.summary} onChange={(v) => set('summary', v)}
              placeholder="Tokenized Treasury fund issued on Ethereum via Securitize" />
          </Field>
          <Field label="Source URL" required hint="Every point must trace back to something public">
            <Input value={form.sourceUrl} onChange={(v) => set('sourceUrl', v)} placeholder="https://..." />
          </Field>

          <div>
            <button
              onClick={() => void submitNew()}
              disabled={status.kind === 'busy'}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-40"
              style={{
                backgroundColor: 'rgba(247,147,26,0.12)',
                borderColor: 'rgba(247,147,26,0.35)',
                color: 'var(--sct-btc)',
              }}
            >
              <Plus size={13} /> Save initiative
            </button>
          </div>
        </div>
      )}

      {/* Ledger */}
      {initiatives.length === 0 ? (
        <div
          className="rounded-lg border p-6 text-center"
          style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--sct-secondary)' }}>Nothing tracked yet.</p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--sct-muted)' }}>
            The series is worth far more with two years of history than with two months, so it is
            worth back-filling by hand as far as you can stand.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
                  {['Institution', 'Initiative', 'Chain', 'Stage', 'Since', ''].map((h) => (
                    <th key={h} className="text-left py-2 px-4 font-medium text-[10px] tracking-widest uppercase"
                      style={{ color: 'var(--sct-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initiatives.map((i) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                    <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--sct-text)' }}>
                      {i.institution}
                      <span className="block text-[10px] font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                        {i.institutionType.replace('_', ' ')} · {i.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4" style={{ color: 'var(--sct-secondary)' }}>
                      {i.name}
                      <span className="block text-[10px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                        {i.summary}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--sct-secondary)' }}>
                      {i.chain ?? '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="rounded px-2 py-0.5 text-[10px] font-medium border whitespace-nowrap"
                        style={{
                          backgroundColor: `${STAGE_COLOR[i.stage]}18`,
                          borderColor: `${STAGE_COLOR[i.stage]}40`,
                          color: STAGE_COLOR[i.stage],
                        }}>
                        {i.stage} {STAGES[i.stage]?.label}
                      </span>
                      <span className="block text-[10px] font-mono mt-1" style={{ color: 'var(--sct-muted)' }}>
                        {verificationLabel(i.verification ?? 'press_only')}
                        {' · '}
                        <span style={{ color: 'var(--sct-secondary)' }}>
                          {initiativeWeight(i.stage, i.verification ?? 'press_only').toFixed(2)}
                        </span>
                        {i.history.length > 1 && ` · ${i.history.length} transitions`}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums" style={{ color: 'var(--sct-muted)' }}>
                      {i.stageDate}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPromoting(i)}
                          title="Record a stage change"
                          className="rounded p-1 transition-colors"
                          style={{ color: 'var(--sct-btc)' }}
                        >
                          <ArrowUpRight size={14} />
                        </button>
                        <button
                          onClick={() => setEditing(i)}
                          title="Edit details"
                          className="rounded p-1 transition-colors"
                          style={{ color: 'var(--sct-secondary)' }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${i.institution} · ${i.name}" and its ${i.history.length} stage events?`)) {
                              void post({ action: 'delete', id: i.id }, 'Deleting', 'Deleted');
                            }
                          }}
                          title="Delete"
                          className="rounded p-1 transition-colors"
                          style={{ color: 'var(--sct-muted)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <EditDialog
          initiative={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (patch) => {
            const ok = await post(
              { action: 'update', id: editing.id, ...patch },
              'Saving changes',
              `Updated ${editing.institution} · ${editing.name}`,
            );
            if (ok) setEditing(null);
          }}
        />
      )}

      {promoting && (
        <PromoteDialog
          initiative={promoting}
          onClose={() => setPromoting(null)}
          onSubmit={async (stage, date, sourceUrl, note) => {
            const ok = await post(
              { action: 'promote', id: promoting.id, stage, date, sourceUrl, note },
              'Recording stage change',
              `${promoting.institution} · ${promoting.name} moved to stage ${stage}`,
            );
            if (ok) setPromoting(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function EditDialog({
  initiative, onClose, onSubmit,
}: {
  initiative: Initiative;
  onClose: () => void;
  onSubmit: (patch: Record<string, string>) => void;
}) {
  // Seeded from the current values, so saving without touching anything is a
  // no-op rather than a wipe.
  const [f, setF] = useState<Record<string, string>>({
    institution:      initiative.institution,
    name:             initiative.name,
    institutionType:  initiative.institutionType,
    category:         initiative.category,
    verification:     initiative.verification ?? 'press_only',
    program:          initiative.program ?? '',
    observableMetric: initiative.observableMetric ?? '',
    chain:            initiative.chain ?? '',
    asset:            initiative.asset ?? '',
    partner:          initiative.partner ?? '',
    country:          initiative.country ?? '',
    valueUsd:         initiative.valueUsd != null ? String(initiative.valueUsd) : '',
    summary:          initiative.summary,
  });
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <div
        className="w-full max-w-2xl rounded-lg border p-5 flex flex-col gap-4 my-8"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Edit {initiative.institution} &middot; {initiative.name}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Stage is not editable here. It moves through Record a stage change, so every
              transition keeps its own date and source.
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--sct-muted)' }}><X size={16} /></button>
        </div>

        <Field label="Verification" hint="The field most likely to need correcting later">
          <div className="flex flex-wrap gap-1.5">
            {VERIFICATIONS.map((v) => (
              <button
                key={v.key}
                onClick={() => set('verification', v.key)}
                title={v.note}
                className="rounded px-2.5 py-1 text-[11px] font-medium border transition-colors"
                style={{
                  backgroundColor: f.verification === v.key ? 'rgba(247,147,26,0.16)' : 'transparent',
                  borderColor: f.verification === v.key ? 'rgba(247,147,26,0.45)' : 'var(--sct-border)',
                  color: f.verification === v.key ? 'var(--sct-btc)' : 'var(--sct-muted)',
                }}
              >
                {v.label}
                <span className="ml-1 font-mono opacity-60">{v.weight.toFixed(1)}</span>
              </button>
            ))}
          </div>
        </Field>

        <p className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
          Now contributes{' '}
          <span style={{ color: 'var(--sct-btc)' }}>
            {initiativeWeight(
              initiative.stage,
              f.verification as (typeof VERIFICATIONS)[number]['key'],
            ).toFixed(2)}
          </span>{' '}
          to the weighted index
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Institution"><Input value={f.institution} onChange={(v) => set('institution', v)} /></Field>
          <Field label="Initiative name"><Input value={f.name} onChange={(v) => set('name', v)} /></Field>
          <Field label="Institution type">
            <Select value={f.institutionType} onChange={(v) => set('institutionType', v)}
              options={INSTITUTION_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') }))} />
          </Field>
          <Field label="Category">
            <Select value={f.category} onChange={(v) => set('category', v)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Programme"><Input value={f.program} onChange={(v) => set('program', v)} /></Field>
          <Field label="Observable metric"><Input value={f.observableMetric} onChange={(v) => set('observableMetric', v)} /></Field>
          <Field label="Chain"><Input value={f.chain} onChange={(v) => set('chain', v)} /></Field>
          <Field label="Asset"><Input value={f.asset} onChange={(v) => set('asset', v)} /></Field>
          <Field label="Partner"><Input value={f.partner} onChange={(v) => set('partner', v)} /></Field>
          <Field label="Country"><Input value={f.country} onChange={(v) => set('country', v)} /></Field>
          <Field label="Value USD"><Input value={f.valueUsd} onChange={(v) => set('valueUsd', v)} /></Field>
        </div>

        <Field label="Summary"><Input value={f.summary} onChange={(v) => set('summary', v)} /></Field>

        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(f)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border"
            style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: 'rgba(247,147,26,0.35)', color: 'var(--sct-btc)' }}
          >
            <Check size={13} /> Save changes
          </button>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium border"
            style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PromoteDialog({
  initiative, onClose, onSubmit,
}: {
  initiative: Initiative;
  onClose: () => void;
  onSubmit: (stage: Stage, date: string, sourceUrl: string, note: string) => void;
}) {
  const [stage, setStage] = useState<number>(Math.min(initiative.stage + 1, 5));
  const [date, setDate] = useState(utcDate());
  const [sourceUrl, setSourceUrl] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <div
        className="w-full max-w-lg rounded-lg border p-5 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              {initiative.institution} · {initiative.name}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Currently stage {initiative.stage} since {initiative.stageDate}
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--sct-muted)' }}><X size={16} /></button>
        </div>

        <Field label="New stage">
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStage(s.value)}
                title={s.note}
                className="rounded px-2.5 py-1 text-[11px] font-medium border transition-colors"
                style={{
                  backgroundColor: stage === s.value ? `${STAGE_COLOR[s.value]}20` : 'transparent',
                  borderColor: stage === s.value ? STAGE_COLOR[s.value] : 'var(--sct-border)',
                  color: stage === s.value ? STAGE_COLOR[s.value] : 'var(--sct-muted)',
                }}
              >
                {s.value} {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Date reached" hint="When it happened, not today">
          <Input value={date} onChange={setDate} placeholder="2026-08-21" />
        </Field>
        <Field label="Source URL" required>
          <Input value={sourceUrl} onChange={setSourceUrl} placeholder="https://..." />
        </Field>
        <Field label="Note">
          <Input value={note} onChange={setNote} placeholder="Optional" />
        </Field>

        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(stage as Stage, date, sourceUrl, note)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border"
            style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: 'rgba(247,147,26,0.35)', color: 'var(--sct-btc)' }}
          >
            <ArrowUpRight size={13} /> Record change
          </button>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium border"
            style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, hint, required, children,
}: {
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

function Input({ value, onChange, placeholder }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md px-3 py-1.5 text-xs border outline-none"
      style={{ backgroundColor: 'var(--sct-bg)', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
    />
  );
}

function Select({ value, onChange, options }: {
  value: string | number; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md px-3 py-1.5 text-xs border outline-none"
      style={{ backgroundColor: 'var(--sct-bg)', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  const tone = status.kind === 'failed' ? 'var(--sct-red)'
    : status.kind === 'done' ? 'var(--sct-green)' : 'var(--sct-secondary)';
  const Icon = status.kind === 'failed' ? TriangleAlert
    : status.kind === 'done' ? Check : Loader2;
  return (
    <div className="flex items-start gap-2 text-xs" style={{ color: tone }}>
      <Icon size={13} className={status.kind === 'busy' ? 'animate-spin shrink-0 mt-0.5' : 'shrink-0 mt-0.5'} />
      <span className="leading-relaxed">{status.message}</span>
    </div>
  );
}
