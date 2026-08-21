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
export const revalidate = 3600;

export async function GET() {
  try {
    const report = await buildDeepResearchReport();
    return NextResponse.json(toResearchSummary(report));
  } catch (err) {
    console.error('[/api/research/summary]', err);
    return NextResponse.json({ error: 'Failed to assemble the research summary' }, { status: 500 });
  }
}
