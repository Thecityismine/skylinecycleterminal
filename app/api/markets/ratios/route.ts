import { NextResponse } from 'next/server';
import { fetchRatioData } from '@/lib/api/ratios';

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await fetchRatioData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
