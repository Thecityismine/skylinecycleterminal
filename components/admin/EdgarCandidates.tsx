"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ExternalLink, X, Loader2, Check, TriangleAlert, FileText } from 'lucide-react';
import type { Candidate } from '@/lib/adoption/edgar';

// Triage for the EDGAR feed.
//
// Optimised for dismissing, because that is what most rows deserve. A filing
// matching "tokenization" is usually a shell company, and the feed earns its
// place by letting you see all of them once and quickly rather than by
// guessing which are which.
//
// Nothing here writes to the index. Anything worth tracking gets typed into the
// form above, deliberately, with a stage and a verification level attached.

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; message: string }
  | { kind: 'done'; message: string }
  | { kind: 'failed'; message: string };

export function EdgarCandidates({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const dismiss = useCallback(async (c: Candidate) => {
    // Hidden immediately so a run of dismissals does not wait on the network.
    // A failure puts it back and says so.
    setHidden((h) => new Set(h).add(c.id));
    try {
      const res = await fetch('/api/adoption/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, status: 'dismissed' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setHidden((h) => { const n = new Set(h); n.delete(c.id); return n; });
        setStatus({ kind: 'failed', message: j.error ?? `HTTP ${res.status}` });
      }
    } catch (e) {
      setHidden((h) => { const n = new Set(h); n.delete(c.id); return n; });
      setStatus({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const pull = useCallback(async () => {
    setStatus({ kind: 'busy', message: 'Querying EDGAR' });
    try {
      const res = await fetch('/api/cron/edgar', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setStatus({ kind: 'failed', message: json.error ?? `HTTP ${res.status}` });
        return;
      }
      setStatus({
        kind: 'done',
        message: `${json.added} new, ${json.refreshed} already seen, ${json.notable} from financial filers`
          + (json.errors?.length ? ` · query errors: ${json.errors.join('; ')}` : ''),
      });
      router.refresh();
    } catch (e) {
      setStatus({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
    }
  }, [router]);

  // Financial filers first, then newest. Firestore orders by filing date alone,
  // because sorting on `notable` server-side would need another composite index
  // for no benefit: the page holds one screenful, so re-sorting it here is free
  // and puts the rows most likely to matter where the eye lands first.
  const visible = candidates
    .filter((c) => !hidden.has(c.id))
    .sort((a, b) => Number(b.notable) - Number(a.notable) || b.fileDate.localeCompare(a.fileDate));

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
    >
      <div
        className="px-4 py-3 border-b flex flex-wrap items-start justify-between gap-3"
        style={{ borderColor: 'var(--sct-border)' }}
      >
        <div>
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--sct-secondary)' }}>
            <FileText size={13} className="text-btc" />
            SEC filings to review
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Full-text matches on tokenization, tokenized fund, digital asset custody, stablecoin and
            distributed ledger. Most are noise. Dismiss freely, they do not come back.
          </p>
        </div>
        <button
          onClick={() => void pull()}
          disabled={status.kind === 'busy'}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-40 shrink-0"
          style={{
            backgroundColor: 'rgba(247,147,26,0.12)',
            borderColor: 'rgba(247,147,26,0.35)',
            color: 'var(--sct-btc)',
          }}
        >
          <RefreshCw size={13} className={status.kind === 'busy' ? 'animate-spin' : ''} />
          Pull now
        </button>
      </div>

      {status.kind !== 'idle' && (
        <div className="px-4 pt-3">
          <StatusLine status={status} />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="px-4 py-6 text-xs text-center" style={{ color: 'var(--sct-muted)' }}>
          Nothing waiting. Pull to check for new filings.
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--sct-border)' }}>
          {visible.map((c) => (
            <li key={c.id} className="px-4 py-3 flex items-start justify-between gap-3"
              style={{ borderTop: '1px solid var(--sct-border)' }}>
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--sct-text)' }}>
                    {c.company}
                  </span>
                  {c.notable && (
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide border whitespace-nowrap"
                      style={{
                        backgroundColor: 'rgba(53,208,127,0.12)',
                        borderColor: 'rgba(53,208,127,0.35)',
                        color: 'var(--sct-green)',
                      }}>
                      FINANCIAL FILER
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                  {c.form} · {c.fileDate}
                  {c.description ? ` · ${c.description}` : ''}
                  {c.matchedTerms.length > 1 ? ` · ${c.matchedTerms.length} terms` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={c.indexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open the filing on sec.gov"
                  className="rounded p-1.5 transition-colors"
                  style={{ color: 'var(--sct-btc)' }}
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => void dismiss(c)}
                  title="Not relevant"
                  className="rounded p-1.5 transition-colors"
                  style={{ color: 'var(--sct-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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
