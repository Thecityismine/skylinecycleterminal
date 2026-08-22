import { NextResponse } from 'next/server';
import { buildDeepResearchReport } from '@/lib/research/report';
import { toResearchSummary } from '@/lib/research/summary';

// Public: read by the landing-page preview card, which has no session. Only the
// headline figures and the top four rows of each evidence column are returned —
// the same fields that card already renders. The report itself stays behind
// app/(protected).
//
// 1-hour CDN cache, matching /api/cycle. The upstream series are published daily
// with a one-day lag, so a fresh build per visitor buys nothing.
// Always rendered fresh. These pages get shared, and `revalidate` is
// stale-while-revalidate: the first visitor after expiry is served the previous
// render while a new one builds behind them, so on a low-traffic page every
// visit shows old data and staleness is unbounded.
//
// fetchCache is required alongside it. force-dynamic is documented as
// equivalent to setting every fetch to no-store, which would re-fetch full
// vendor history on each view. default-cache restores the per-fetch
// `next: { revalidate }` in lib/api/*, so the route recomputes per request
// while the vendor call stays cached.
export const dynamic = 'force-dynamic';
export const fetchCache = 'default-cache';
export async function GET() {
  try {
    const report = await buildDeepResearchReport();
    return NextResponse.json(toResearchSummary(report));
  } catch (err) {
    console.error('[/api/research/summary]', err);
    return NextResponse.json({ error: 'Failed to assemble the research summary' }, { status: 500 });
  }
}
