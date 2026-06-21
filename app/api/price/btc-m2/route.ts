import { NextResponse }  from 'next/server';
import { computeBtcM2 } from '@/lib/indicators/btcM2';

export const revalidate = 86400;

export type { BtcM2Point } from '@/lib/indicators/btcM2';

export async function GET() {
  try {
    const result = await computeBtcM2();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
