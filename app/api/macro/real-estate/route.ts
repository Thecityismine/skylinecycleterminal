import { NextResponse } from 'next/server';
import { fetchHousingData } from '@/lib/api/fredHousing';
import { computeRealEstateScore } from '@/lib/indicators/realEstateCycle';

// The Real Estate Opportunity Score as JSON.
//
// Mirrors the pattern the other indicators use: the page renders this, and
// having it addressable means a share card or a scheduled draft can quote the
// identical numbers rather than recomputing and drifting.

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-cache';

export async function GET() {
  try {
    const data = await fetchHousingData();
    const result = computeRealEstateScore(data);

    return NextResponse.json({
      score:    result.score,
      label:    result.label,
      coverage: result.coverage,
      affordability: result.affordability,
      pillars: result.pillars.map((p) => ({
        key:      p.key,
        title:    p.title,
        weight:   p.weight,
        score:    p.score,
        coverage: p.coverage,
        metrics:  p.metrics.map((m) => ({
          key:        m.key,
          label:      m.label,
          display:    m.display,
          score:      m.score,
          percentile: m.percentile,
          depth:      m.depth,
        })),
      })),
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/macro/real-estate]', err);
    return NextResponse.json({ error: 'Failed to compute real estate score' }, { status: 500 });
  }
}
