import { NextResponse } from 'next/server';
import { fetchMacroData } from '@/lib/api/fred';

// 24-hour CDN cache â€” FRED releases most series once per day
export const revalidate = 3600;

export async function GET() {
  try {
    const data = await fetchMacroData();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/macro]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/macro]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
