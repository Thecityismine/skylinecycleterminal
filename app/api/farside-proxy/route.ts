export const runtime = 'edge';

const FARSIDE_URL = 'https://farside.co.uk/bitcoin-etf-flow-all-data/';

// Runs on Vercel Edge (Cloudflare's network), not AWS Lambda.
// Cloudflare WAF is less likely to block same-network requests.
export async function GET() {
  try {
    const res = await fetch(FARSIDE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Farside returned ${res.status}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await res.text();
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
