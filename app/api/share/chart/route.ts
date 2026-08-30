import { NextResponse } from 'next/server';
import { renderChartCardPng } from '@/lib/share/server/renderCard';
import { COLORS } from '@/lib/share/server/chartSvg';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { computeRegime } from '@/lib/indicators/regimeHelpers';
import { computeRealizedVolatility } from '@/lib/indicators/realizedVolatility';
import { calculateDrawdownFromATH, getDrawdownRegime, drawdownSeverityPct } from '@/lib/indicators/drawdownFromATH';

// Renders a chart card as a PNG, server side, with no browser.
//
// This is the piece the weekly X post and the marketing imagery both needed:
// the existing share cards can only be produced by a person clicking a button,
// because html-to-image requires a DOM. These can be produced by a cron job, or
// by anything else that can make an HTTP request.
//
//   /api/share/chart?type=regime      price against its 200-day average
//   /api/share/chart?type=volatility  30d and 90d realized volatility
//
// Public and cacheable. It renders the same numbers already on the public
// endpoints, so there is nothing here to gate, and a social crawler fetching
// the image should not be made to wait on a re-render.

export const dynamic = 'force-dynamic';

const DAY = 86_400;

/** Evenly spaced labels across a series of ISO dates. */
function xLabels(times: string[], count = 5): string[] {
  if (times.length < 2) return times;
  return Array.from({ length: count }, (_, i) => {
    const t = times[Math.round((i / (count - 1)) * (times.length - 1))];
    return new Date(t + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'short', year: '2-digit', timeZone: 'UTC',
    });
  });
}

const usd = (n: number) =>
  n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n.toFixed(0)}`;

const today = () =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Keeps the drawn series near a thousand points; beyond that the line is mush. */
function thin<T>(arr: T[], max = 900): T[] {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
}

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get('type') ?? 'regime';

  try {
    const prices = await fetchBTCDailyPrice('2012-01-01');
    if (!prices.length) throw new Error('no price data');

    let card;

    if (type === 'volatility') {
      const { points, current, compressedAt } = computeRealizedVolatility(prices);
      const p = thin(points);
      card = {
        title:    'Bitcoin Realized Volatility',
        subtitle: 'Annualized standard deviation of daily log returns',
        date:     today(),
        xLabels:  xLabels(p.map((d) => d.time)),
        logScale: false,
        yFormat:  (v: number) => `${v.toFixed(0)}%`,
        series: [
          { label: '30-day', color: '#38BDF8', points: p.map((d) => d.rv30 ?? NaN) },
          { label: '90-day', color: COLORS.violet, points: p.map((d) => d.rv90 ?? NaN) },
        ],
        stats: [
          { label: '30-Day Realized Vol', value: current.rv30 == null ? '—' : `${current.rv30.toFixed(1)}%`,
            sub: 'annualized', color: COLORS.green },
          { label: 'Historical Percentile', value: current.percentile == null ? '—' : `${current.percentile.toFixed(0)}th`,
            sub: 'of all history since 2012' },
          { label: 'Long-Run Average', value: current.longRunMean == null ? '—' : `${current.longRunMean.toFixed(0)}%`,
            sub: 'mean 30d vol' },
          { label: 'Compression Below', value: compressedAt == null ? '—' : `${compressedAt.toFixed(1)}%`,
            sub: 'bottom 15% of history', color: COLORS.amber },
        ],
      };
    } else if (type === 'drawdown') {
      const all = calculateDrawdownFromATH(prices);
      const p = thin(all);
      const last = all.at(-1)!;
      const regime = getDrawdownRegime(last.drawdown);
      const severity = drawdownSeverityPct(all.map((d) => d.drawdown), last.drawdown);
      card = {
        title:    'Bitcoin Drawdown From All-Time High',
        subtitle: 'How far price sits below its running peak',
        date:     today(),
        xLabels:  xLabels(p.map((d) => d.time)),
        logScale: false,
        // Drawdown is the card that most needs an axis: without one there is no
        // way to tell whether the peaks are good or bad.
        yFormat:  (v: number) => `${v.toFixed(0)}%`,
        series: [
          { label: 'Drawdown', color: COLORS.red, points: p.map((d) => d.drawdown) },
        ],
        stats: [
          { label: 'Current Drawdown', value: `${last.drawdown.toFixed(1)}%`,
            sub: regime.label, color: regime.color },
          { label: 'All-Time High', value: usd(last.ath), sub: 'running peak' },
          { label: 'BTC Price', value: usd(last.close), sub: 'latest close', color: COLORS.btc },
          { label: 'Historical Severity', value: `${severity}th`,
            sub: 'percentile of all days', color: COLORS.amber },
        ],
      };
    } else {
      const { points, current } = computeRegime(prices);
      const p = thin(points);
      const regimeColor =
        current.regime === 'bull' ? COLORS.green
        : current.regime === 'bear' ? COLORS.red
        : COLORS.amber;
      card = {
        title:    'Bitcoin Market Regime',
        subtitle: 'Price against its 200-day moving average',
        date:     today(),
        xLabels:  xLabels(p.map((d) => d.time)),
        logScale: true,
        yFormat:  usd,
        series: [
          { label: 'BTC Price', color: COLORS.btc, points: p.map((d) => d.price) },
          { label: '200-Day MA', color: COLORS.violet, points: p.map((d) => d.ma200 ?? NaN) },
        ],
        stats: [
          { label: 'Regime', value: current.regime.toUpperCase(),
            sub: `${current.daysInRegime} days`, color: regimeColor },
          { label: 'BTC Price', value: current.price == null ? '—' : usd(current.price),
            sub: 'latest close', color: COLORS.btc },
          { label: '200-Day MA', value: current.ma200 == null ? '—' : usd(current.ma200),
            sub: current.ma200Direction, color: COLORS.violet },
          { label: 'Price vs MA', value: current.priceVsMA200 == null ? '—' : `${current.priceVsMA200 > 0 ? '+' : ''}${current.priceVsMA200.toFixed(1)}%`,
            sub: 'above or below', color: (current.priceVsMA200 ?? 0) >= 0 ? COLORS.green : COLORS.red },
        ],
      };
    }

    const png = await renderChartCardPng(card);

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        // Long enough that a burst of crawler hits costs one render, short
        // enough that the card is never a day stale.
        'Cache-Control': `public, max-age=${DAY / 24}, s-maxage=${DAY / 24}, stale-while-revalidate=${DAY}`,
      },
    });
  } catch (err) {
    console.error('[/api/share/chart]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'render failed' },
      { status: 500 },
    );
  }
}
