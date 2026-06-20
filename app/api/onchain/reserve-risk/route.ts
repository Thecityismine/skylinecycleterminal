import { NextResponse } from 'next/server';
import { fetchReserveRiskData } from '@/lib/api/coinmetrics';
import { computeReserveRisk } from '@/lib/indicators/reserveRisk';

export const revalidate = 86400;

export async function GET() {
  try {
    const raw    = await fetchReserveRiskData('2012-01-01');
    const result = computeReserveRisk(raw);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/onchain/reserve-risk]', err);
    return NextResponse.json({ error: 'Failed to compute Reserve Risk' }, { status: 500 });
  }
}
