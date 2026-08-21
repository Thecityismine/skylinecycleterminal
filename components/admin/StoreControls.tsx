"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Eye, Loader2, Check, TriangleAlert, Database } from 'lucide-react';

// Buttons for the jobs that would otherwise be curl commands.
//
// The daily snapshot runs itself once the scheduled function is deployed, so
// nothing here needs pressing on a schedule. These exist for the first run, for
// seeding history, and for checking the pipeline still works without opening a
// terminal.
//
// Backfill resumes itself: a full seed is tens of thousands of rows and the
// route answers with a nextOffset rather than trying to write them all inside
// one request. Chaining those calls here keeps that a single click.

const BACKFILL_SOURCES = [
  { value: 'fearGreed',        label: 'Fear & Greed',      note: 'small, free, unrestricted. Best first run.' },
  { value: 'stablecoinSupply', label: 'Stablecoin supply', note: 'DefiLlama, commercially clean.' },
  { value: 'btcPrice',         label: 'BTC price',         note: 'large. Coin Metrics licence caveat applies.' },
  { value: 'btcMarketCap',     label: 'BTC network data',  note: 'largest. Market cap, transactions, addresses, issuance.' },
  { value: 'all',              label: 'Everything',        note: 'all of the above in one pass.' },
] as const;

type Status =
  | { kind: 'idle' }
  | { kind: 'running'; message: string }
  | { kind: 'done'; message: string }
  | { kind: 'failed'; message: string };

const MAX_BACKFILL_PAGES = 40;   // hard stop so a bad nextOffset cannot loop forever

export function StoreControls() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Status>({ kind: 'idle' });
  const [backfill, setBackfill] = useState<Status>({ kind: 'idle' });
  const [source, setSource] = useState<string>('fearGreed');

  const runSnapshot = useCallback(async (dryRun: boolean) => {
    setSnapshot({ kind: 'running', message: dryRun ? 'Building report, no write' : 'Building report and writing' });
    try {
      const res = await fetch(`/api/cron/snapshot${dryRun ? '?dryRun=1' : ''}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setSnapshot({ kind: 'failed', message: json.error ?? `HTTP ${res.status}` });
        return;
      }

      setSnapshot({
        kind: 'done',
        message: dryRun
          ? `Preview only. Score ${Math.round(json.cycleScore)} as of ${json.asOfDate}, ${json.wouldWrite} rows ready.`
          : `Score ${Math.round(json.cycleScore)} as of ${json.asOfDate}. Wrote ${json.written} rows, skipped ${json.skipped}.`,
      });

      if (!dryRun) router.refresh();
    } catch (e) {
      setSnapshot({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
    }
  }, [router]);

  const runBackfill = useCallback(async (dryRun: boolean) => {
    const label = BACKFILL_SOURCES.find((s) => s.value === source)?.label ?? source;
    let offset = 0;
    let written = 0;
    let pages = 0;

    setBackfill({ kind: 'running', message: `${label}: starting` });

    try {
      for (;;) {
        const qs = new URLSearchParams({ source, offset: String(offset) });
        if (dryRun) qs.set('dryRun', '1');

        const res = await fetch(`/api/cron/backfill?${qs}`, { method: 'POST', cache: 'no-store' });
        const json = await res.json();

        if (!res.ok || json.ok === false) {
          setBackfill({ kind: 'failed', message: json.error ?? `HTTP ${res.status}` });
          return;
        }

        if (dryRun) {
          setBackfill({
            kind: 'done',
            message: `Preview only. ${label} would write ${json.totalRows} rows.` +
              (json.errors?.length ? ` Source errors: ${json.errors.join('; ')}` : ''),
          });
          return;
        }

        written += json.written ?? 0;
        pages += 1;
        setBackfill({ kind: 'running', message: `${label}: ${written} of ${json.totalRows} rows written` });

        if (json.nextOffset == null) {
          setBackfill({
            kind: 'done',
            message: `${label}: ${written} rows written.` +
              (json.errors?.length ? ` Source errors: ${json.errors.join('; ')}` : ''),
          });
          router.refresh();
          return;
        }

        if (pages >= MAX_BACKFILL_PAGES) {
          setBackfill({
            kind: 'failed',
            message: `Stopped after ${pages} passes with ${written} rows written. Run again to continue.`,
          });
          router.refresh();
          return;
        }

        offset = json.nextOffset;
      }
    } catch (e) {
      setBackfill({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
    }
  }, [source, router]);

  const busy = snapshot.kind === 'running' || backfill.kind === 'running';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card
        icon={Database}
        title="Daily snapshot"
        body="Runs the research report once and records what it read. This is what the scheduled function calls at 08:30 Eastern, so you only need it here for the first run or to check the pipeline."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runSnapshot(true)} disabled={busy} icon={Eye} variant="ghost">
            Preview
          </Button>
          <Button onClick={() => runSnapshot(false)} disabled={busy} icon={Play} variant="primary">
            Run and record
          </Button>
        </div>
        <StatusLine status={snapshot} />
      </Card>

      <Card
        icon={Database}
        title="Seed history"
        body="Fills the store from vendor historical series. Rows written here are flagged as backfilled and are excluded from point-in-time reads, because they carry every revision the vendor has made since."
      >
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={busy}
          className="w-full rounded-md px-3 py-2 text-sm border outline-none"
          style={{
            backgroundColor: 'var(--sct-bg)',
            borderColor: 'var(--sct-border)',
            color: 'var(--sct-text)',
          }}
        >
          {BACKFILL_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
          {BACKFILL_SOURCES.find((s) => s.value === source)?.note}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runBackfill(true)} disabled={busy} icon={Eye} variant="ghost">
            Preview
          </Button>
          <Button onClick={() => runBackfill(false)} disabled={busy} icon={Play} variant="primary">
            Seed
          </Button>
        </div>
        <StatusLine status={backfill} />
      </Card>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function Card({
  icon: Icon, title, body, children,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border p-5 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-btc shrink-0" />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>{title}</h2>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{body}</p>
      {children}
    </div>
  );
}

function Button({
  onClick, disabled, icon: Icon, variant, children,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ElementType;
  variant: 'primary' | 'ghost';
  children: React.ReactNode;
}) {
  const primary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        backgroundColor: primary ? 'rgba(247,147,26,0.12)' : 'transparent',
        borderColor: primary ? 'rgba(247,147,26,0.35)' : 'var(--sct-border)',
        color: primary ? 'var(--sct-btc)' : 'var(--sct-secondary)',
      }}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;

  const tone =
    status.kind === 'failed' ? 'var(--sct-red)'
    : status.kind === 'done' ? 'var(--sct-green)'
    : 'var(--sct-secondary)';

  const Icon =
    status.kind === 'failed' ? TriangleAlert
    : status.kind === 'done' ? Check
    : Loader2;

  return (
    <div className="flex items-start gap-2 text-xs" style={{ color: tone }}>
      <Icon size={13} className={status.kind === 'running' ? 'animate-spin shrink-0 mt-0.5' : 'shrink-0 mt-0.5'} />
      <span className="leading-relaxed">{status.message}</span>
    </div>
  );
}
