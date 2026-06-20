import { NextResponse } from 'next/server';
import { fetchCrossAssetData } from '@/lib/api/crossAsset';
import { computeRegime } from '@/lib/indicators/regimeHelpers';

export const revalidate = 86400;

export async function GET() {
  try {
    const { points, latest, btcHistory } = await fetchCrossAssetData();
    const { zones } = computeRegime(btcHistory);
    return NextResponse.json({ points, latest, zones });
  } catch (err) {
    console.error('[/api/markets/cross-asset]', err);
    return NextResponse.json({ error: 'Failed to fetch cross-asset data' }, { status: 500 });
  }
}
