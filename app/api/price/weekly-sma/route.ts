import { NextResponse } from 'next/server';
import { fetchWeeklySMAData } from '@/lib/api/weeklySMA';

export const revalidate = 86400;

export async function GET() {
  try {
    const data = await fetchWeeklySMAData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
