import { NextResponse } from 'next/server';
import { fetchMacroData } from '@/lib/api/fred';

// 24-hour CDN cache — FRED releases most series once per day
export const revalidate = 86400;

export async function GET() {
  try {
    const data = await fetchMacroData();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/macro]', err);
    return NextResponse.json({ error: 'Failed to fetch macro data' }, { status: 500 });
  }
}
