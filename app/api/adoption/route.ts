import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/access';
import {
  createInitiative, addStageEvent, deleteInitiative, updateInitiative, listInitiatives,
  buildIndexSeries, breakdownByChain,
  isStage, isIsoDate, isVerification, INSTITUTION_TYPES, CATEGORIES, VERIFICATIONS,
  breakdownByVerification,
  type InstitutionType, type Category, type Stage, type StageEvent, type Verification,
} from '@/lib/adoption/initiatives';

// Institutional Adoption Index, admin CRUD.
//
// Admin only in both directions for now. The index is the proprietary half of
// this module: the inputs are public but the classified series is not, and it
// should not be readable before there is enough of it to be worth publishing
// deliberately.
//
// Classification is a judgement call, so this is a form rather than a pipeline.
// Deciding whether an announcement is a pilot or a production launch is the
// part that cannot be automated, and it is also the reason the resulting series
// is worth something.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type CreateBody = {
  action?: 'create';
  institution?: string;
  institutionType?: string;
  name?: string;
  category?: string;
  program?: string;
  verification?: string;
  observableMetric?: string;
  chain?: string;
  asset?: string;
  partner?: string;
  country?: string;
  valueUsd?: number | string;
  summary?: string;
  initialStage?: number;
  initialDate?: string;
  sourceUrl?: string;
  note?: string;
};

type PromoteBody = {
  action: 'promote';
  id?: string;
  stage?: number;
  date?: string;
  sourceUrl?: string;
  note?: string;
};

type DeleteBody = { action: 'delete'; id?: string };

type UpdateBody = {
  action: 'update';
  id?: string;
} & Omit<CreateBody, 'action' | 'initialStage' | 'initialDate' | 'sourceUrl' | 'note'>;

type Body = CreateBody | PromoteBody | DeleteBody | UpdateBody;

function nullableText(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}

function nullableNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isInstitutionType(v: unknown): v is InstitutionType {
  return typeof v === 'string' && (INSTITUTION_TYPES as readonly string[]).includes(v);
}

function isCategory(v: unknown): v is Category {
  return typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }
  try {
    const initiatives = await listInitiatives();
    return NextResponse.json({
      ok: true,
      initiatives,
      series: buildIndexSeries(initiatives),
      byChain: breakdownByChain(initiatives),
      byVerification: breakdownByVerification(initiatives),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[adoption] list failed:', message);
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
      if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      await deleteInitiative(body.id);
      return NextResponse.json({ ok: true, deleted: body.id });
    }

    if (body.action === 'promote') {
      const { id, stage, date, sourceUrl, note } = body;
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
      if (!isStage(stage)) return NextResponse.json({ error: 'stage must be 0-5' }, { status: 400 });
      if (!isIsoDate(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
      if (!sourceUrl?.trim()) {
        // A stage change without a source is an opinion, and the point of the
        // series is that every point can be traced back to something public.
        return NextResponse.json({ error: 'sourceUrl is required for a stage change' }, { status: 400 });
      }

      const event: StageEvent = {
        stage: stage as Stage,
        date,
        sourceUrl: sourceUrl.trim(),
        recordedAt: new Date().toISOString(),
        ...(note?.trim() ? { note: note.trim() } : {}),
      };
      const updated = await addStageEvent(id, event);
      return NextResponse.json({ ok: true, initiative: updated });
    }

    if (body.action === 'update') {
      const u = body as UpdateBody;
      if (!u.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

      // Only fields actually supplied are patched, so an edit dialog that omits
      // a field leaves it alone rather than nulling it.
      const patch: Record<string, unknown> = {};
      if (u.institution?.trim())     patch.institution = u.institution.trim();
      if (u.name?.trim())            patch.name = u.name.trim();
      if (u.summary?.trim())         patch.summary = u.summary.trim();
      if (isInstitutionType(u.institutionType)) patch.institutionType = u.institutionType;
      if (isCategory(u.category))    patch.category = u.category;
      if (isVerification(u.verification)) patch.verification = u.verification;
      if (u.program !== undefined)   patch.program = nullableText(u.program);
      if (u.observableMetric !== undefined) patch.observableMetric = nullableText(u.observableMetric);
      if (u.chain !== undefined)     patch.chain = nullableText(u.chain);
      if (u.asset !== undefined)     patch.asset = nullableText(u.asset);
      if (u.partner !== undefined)   patch.partner = nullableText(u.partner);
      if (u.country !== undefined)   patch.country = nullableText(u.country);
      if (u.valueUsd !== undefined)  patch.valueUsd = nullableNumber(u.valueUsd);

      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
      }

      const updated = await updateInitiative(u.id, patch);
      return NextResponse.json({ ok: true, initiative: updated });
    }

    // Default: create
    const b = body as CreateBody;
    const missing = (['institution', 'name', 'summary', 'sourceUrl'] as const)
      .filter((k) => !b[k]?.toString().trim());
    if (missing.length) {
      return NextResponse.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 });
    }
    if (!isInstitutionType(b.institutionType)) {
      return NextResponse.json(
        { error: `institutionType must be one of: ${INSTITUTION_TYPES.join(', ')}` }, { status: 400 },
      );
    }
    if (!isCategory(b.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${CATEGORIES.join(', ')}` }, { status: 400 },
      );
    }
    if (!isVerification(b.verification)) {
      return NextResponse.json(
        { error: `verification must be one of: ${VERIFICATIONS.map((v) => v.key).join(', ')}` }, { status: 400 },
      );
    }
    if (!isStage(b.initialStage)) {
      return NextResponse.json({ error: 'initialStage must be 0-5' }, { status: 400 });
    }
    if (!isIsoDate(b.initialDate)) {
      return NextResponse.json({ error: 'initialDate must be YYYY-MM-DD' }, { status: 400 });
    }

    const created = await createInitiative({
      institution:     String(b.institution),
      institutionType: b.institutionType,
      name:            String(b.name),
      category:        b.category,
      program:         nullableText(b.program),
      verification:    b.verification as Verification,
      observableMetric: nullableText(b.observableMetric),
      chain:           nullableText(b.chain),
      asset:           nullableText(b.asset),
      partner:         nullableText(b.partner),
      country:         nullableText(b.country),
      valueUsd:        nullableNumber(b.valueUsd),
      summary:         String(b.summary),
      initialStage:    b.initialStage as Stage,
      initialDate:     b.initialDate,
      sourceUrl:       String(b.sourceUrl).trim(),
      note:            b.note?.trim() || undefined,
    });

    return NextResponse.json({ ok: true, initiative: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // A duplicate id surfaces here, from create()'s ALREADY_EXISTS.
    const isDuplicate = message.includes('ALREADY_EXISTS') || message.includes('already exists');
    console.error('[adoption] write failed:', message);
    return NextResponse.json(
      { ok: false, error: isDuplicate ? 'An initiative with that id already exists. Promote it instead of re-adding it.' : message },
      { status: isDuplicate ? 409 : 500 },
    );
  }
}
