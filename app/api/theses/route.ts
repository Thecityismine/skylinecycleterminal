import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/access';
import {
  createThesis, updateThesis, setThesisStatus, addReview, deleteThesis,
  listTheses, evaluateActiveTheses, trackRecord,
  isThesisStatus, isConviction, isOperator, isIsoDate, utcDate,
  type Conviction, type InvalidationRule, type ThesisReview,
} from '@/lib/theses/theses';

// Thesis register, admin CRUD plus evaluation.
//
// Admin only. The register is where calls are recorded before they resolve,
// including the ones that go wrong, and it should not be readable until there
// is a deliberate decision to publish it.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = Record<string, unknown> & { action?: string };

function text(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback;
}

function lines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse invalidation rules, dropping anything malformed rather than storing it.
 *
 * A rule that cannot be evaluated is worse than no rule: it looks like coverage
 * while checking nothing, which is exactly the false comfort this register
 * exists to remove.
 */
function parseRules(v: unknown): InvalidationRule[] {
  if (!Array.isArray(v)) return [];
  const out: InvalidationRule[] = [];
  v.forEach((raw, i) => {
    const r = raw as Record<string, unknown>;
    const metric = text(r.metric);
    const value = Number(r.value);
    if (!metric || !isOperator(r.operator) || !Number.isFinite(value)) return;
    const sustained = Math.max(1, Math.min(365, Number(r.sustainedDays) || 1));
    out.push({
      id: text(r.id) || `r${i + 1}`,
      metric,
      operator: r.operator,
      value,
      sustainedDays: sustained,
      ...(text(r.note) ? { note: text(r.note) } : {}),
    });
  });
  return out;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }
  try {
    const [theses, evaluations] = await Promise.all([listTheses(), evaluateActiveTheses()]);
    return NextResponse.json({
      ok: true,
      theses,
      evaluations,
      record: trackRecord(theses),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[theses] list failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  try {
    if (body.action === 'delete') {
      const id = text(body.id);
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      await deleteThesis(id);
      return NextResponse.json({ ok: true, deleted: id });
    }

    if (body.action === 'status') {
      const id = text(body.id);
      const note = text(body.note);
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      if (!isThesisStatus(body.status)) {
        return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
      }
      // Closing without saying why leaves nothing to learn from later, which
      // defeats the point of keeping the wrong ones.
      if (body.status !== 'active' && !note) {
        return NextResponse.json(
          { error: 'A note is required when closing a thesis. Say what happened.' },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: true, thesis: await setThesisStatus(id, body.status, note) });
    }

    if (body.action === 'review') {
      const id = text(body.id);
      const note = text(body.note);
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      if (!note) return NextResponse.json({ error: 'A review needs a note' }, { status: 400 });
      if (!isConviction(body.conviction)) {
        return NextResponse.json({ error: 'conviction must be low, medium or high' }, { status: 400 });
      }
      const date = isIsoDate(body.date) ? body.date : utcDate();
      const review: ThesisReview = {
        date,
        note,
        conviction: body.conviction as Conviction,
        recordedAt: new Date().toISOString(),
      };
      return NextResponse.json({ ok: true, thesis: await addReview(id, review) });
    }

    if (body.action === 'update') {
      const id = text(body.id);
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

      const patch: Record<string, unknown> = {};
      if (body.title !== undefined)             patch.title = text(body.title);
      if (body.asset !== undefined)             patch.asset = text(body.asset);
      if (body.entryContext !== undefined)      patch.entryContext = text(body.entryContext);
      if (body.horizon !== undefined)           patch.horizon = text(body.horizon);
      if (isConviction(body.conviction))        patch.conviction = body.conviction;
      if (body.bullCase !== undefined)          patch.bullCase = text(body.bullCase);
      if (body.baseCase !== undefined)          patch.baseCase = text(body.baseCase);
      if (body.bearCase !== undefined)          patch.bearCase = text(body.bearCase);
      if (body.catalysts !== undefined)         patch.catalysts = lines(body.catalysts);
      if (body.risks !== undefined)             patch.risks = lines(body.risks);
      if (body.invalidationNotes !== undefined) patch.invalidationNotes = text(body.invalidationNotes);
      if (body.rules !== undefined)             patch.rules = parseRules(body.rules);

      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
      }
      return NextResponse.json({ ok: true, thesis: await updateThesis(id, patch) });
    }

    // Default: create
    const title = text(body.title);
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!isConviction(body.conviction)) {
      return NextResponse.json({ error: 'conviction must be low, medium or high' }, { status: 400 });
    }

    const invalidationNotes = text(body.invalidationNotes);
    const rules = parseRules(body.rules);
    // The whole premise is that a thesis states in advance what would prove it
    // wrong. One or the other must be present.
    if (!invalidationNotes && rules.length === 0) {
      return NextResponse.json(
        { error: 'A thesis needs invalidation criteria. Add a rule, or write what would prove it wrong.' },
        { status: 400 },
      );
    }

    const created = await createThesis({
      title,
      asset:        text(body.asset, 'BTC'),
      entryContext: text(body.entryContext),
      horizon:      text(body.horizon),
      conviction:   body.conviction as Conviction,
      bullCase:     text(body.bullCase),
      baseCase:     text(body.baseCase),
      bearCase:     text(body.bearCase),
      catalysts:    lines(body.catalysts),
      risks:        lines(body.risks),
      invalidationNotes,
      rules,
    });

    return NextResponse.json({ ok: true, thesis: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const duplicate = message.includes('ALREADY_EXISTS') || message.includes('already exists');
    console.error('[theses] write failed:', message);
    return NextResponse.json(
      { ok: false, error: duplicate ? 'A thesis with that title already exists.' : message },
      { status: duplicate ? 409 : 500 },
    );
  }
}
