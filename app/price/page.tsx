"use client";

import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { PriceStructureChart, RSIPanel, MACDPanel } from '@/components/charts/PriceStructureChart';

// ─── Constants ───────────────────────────────────────────────────────────────

const GENESIS_MS = new Date('2009-01-03').getTime();
const HALVINGS   = ['2012-11-28', '2016-07-09', '2020-05-11', '2024-04-19'];

type PricePoint = { time: string; price: number };

const TIMEFRAMES  = ['1Y', '2Y', '4Y', 'All'] as const;
type Timeframe = typeof TIMEFRAMES[number];
const TF_DAYS: Record<Timeframe, number> = { '1Y': 365, '2Y': 730, '4Y': 1460, 'All': Infinity };

const OVERLAY_COLORS: Record<string, string> = {
  '200 DMA':        '#3B82F6',
  '2Y MA':          '#35D07F',
  'Log Regression': '#A855F7',
  'Halvings':       '#F97316',
};

// ─── Computations ─────────────────────────────────────────────────────────────

function smaSliding(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = e;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

function computeRSI(prices: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period + 1) return out;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function computeMACD(prices: number[]) {
  const e12 = ema(prices, 12);
  const e26 = ema(prices, 26);
  const macdLine = e12.map((v, i) => (v != null && e26[i] != null ? v - e26[i]! : null));
  // Seed EMA(9) computation using non-null macd values padded with 0
  const seed = macdLine.map(v => v ?? 0);
  const sig  = ema(seed, 9);
  return macdLine.map((m, i) => ({
    macd:      e26[i] != null ? m         : null,
    signal:    e26[i] != null ? sig[i]    : null,
    histogram: e26[i] != null && sig[i] != null && m != null ? m - sig[i]! : null,
  }));
}

function logRegression(dateStr: string): number | null {
  const days = (new Date(dateStr + 'T00:00:00').getTime() - GENESIS_MS) / 86_400_000;
  if (days <= 0) return null;
  return Math.pow(10, 5.8 * Math.log10(days) - 17.3);
}

function downsample<T>(arr: T[], max = 800): T[] {
  if (arr.length <= max) return arr;
  const step = Math.floor(arr.length / max);
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PricePage() {
  const [asset,     setAsset]     = useState<'btc' | 'eth'>('btc');
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const [overlays,  setOverlays]  = useState<Set<string>>(new Set(['200 DMA', 'Halvings']));
  const [logScale,  setLogScale]  = useState(false);

  const { data: priceData, loading } = useApiData<{ prices: PricePoint[] }>(
    `/api/price?asset=${asset}&start=2010-01-01`
  );

  function toggleOverlay(name: string) {
    setOverlays(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  // Enrich full dataset with all computed overlays
  const enriched = useMemo(() => {
    if (!priceData?.prices.length) return [];
    const pts    = priceData.prices;
    const prices = pts.map(p => p.price);
    const dma200 = smaSliding(prices, 200);
    const ma2y   = smaSliding(prices, 730);
    const rsiArr = computeRSI(prices, 14);
    const macdArr = computeMACD(prices);
    return pts.map((p, i) => ({
      time:      p.time,
      price:     p.price,
      dma200:    dma200[i],
      ma2y:      ma2y[i],
      logReg:    asset === 'btc' ? logRegression(p.time) : null,
      rsi:       rsiArr[i],
      macd:      macdArr[i].macd,
      signal:    macdArr[i].signal,
      histogram: macdArr[i].histogram,
    }));
  }, [priceData, asset]);

  // Slice by timeframe then downsample for render performance
  const displayed = useMemo(() => {
    const days = TF_DAYS[timeframe];
    const sliced = days === Infinity
      ? enriched
      : enriched.filter(d => new Date(d.time).getTime() >= Date.now() - days * 86_400_000);
    return downsample(sliced, 800);
  }, [enriched, timeframe]);

  const halvingsInRange = HALVINGS.filter(h =>
    displayed.length > 0 && h >= displayed[0].time && h <= displayed[displayed.length - 1].time
  );

  const latest      = displayed[displayed.length - 1];
  const first       = displayed[0];
  const priceChange = latest && first ? ((latest.price - first.price) / first.price) * 100 : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Price Structure"
        subtitle="BTC & ETH technical analysis with cycle overlays"
      />

      {/* Top controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Asset tabs */}
        <div className="flex gap-2">
          {(['btc', 'eth'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAsset(a)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150"
              style={{
                backgroundColor: asset === a ? 'var(--sct-card)' : 'transparent',
                borderColor: asset === a ? (a === 'btc' ? '#F7931A' : '#627EEA') : 'var(--sct-border)',
                color:       asset === a ? (a === 'btc' ? '#F7931A' : '#627EEA') : 'var(--sct-muted)',
              }}
            >
              {a === 'btc' ? 'BTC / USD' : 'ETH / USD'}
            </button>
          ))}
        </div>

        {/* Timeframe + log toggle */}
        <div className="flex items-center gap-2">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: timeframe === tf ? 'var(--sct-border)' : 'transparent',
                borderColor: 'var(--sct-border)',
                color: timeframe === tf ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {tf}
            </button>
          ))}
          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--sct-border)' }} />
          <button
            onClick={() => setLogScale(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: logScale ? '#A855F720' : 'transparent',
              borderColor: logScale ? '#A855F7' : 'var(--sct-border)',
              color: logScale ? '#A855F7' : 'var(--sct-muted)',
            }}
          >
            LOG
          </button>
        </div>
      </div>

      {/* Overlay toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono mr-1" style={{ color: 'var(--sct-muted)' }}>Overlays</span>
        {Object.keys(OVERLAY_COLORS).map(ov => {
          const disabled = ov === 'Log Regression' && asset === 'eth';
          const active   = overlays.has(ov) && !disabled;
          const col      = OVERLAY_COLORS[ov];
          return (
            <button
              key={ov}
              onClick={() => !disabled && toggleOverlay(ov)}
              disabled={disabled}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: active ? col + '20' : 'transparent',
                borderColor: active ? col : 'var(--sct-border)',
                color: active ? col : 'var(--sct-muted)',
                opacity: disabled ? 0.3 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {ov}
            </button>
          );
        })}
      </div>

      {/* Main price chart */}
      {loading || !displayed.length
        ? <ChartSkeleton height="h-[460px]" />
        : <PriceStructureChart
            data={displayed}
            overlays={overlays}
            halvings={halvingsInRange}
            logScale={logScale}
            asset={asset}
            priceChange={priceChange}
          />
      }

      {/* RSI + MACD sub-panels */}
      {loading || !displayed.length
        ? (
          <div className="grid grid-cols-2 gap-6">
            <ChartSkeleton height="h-[170px]" />
            <ChartSkeleton height="h-[170px]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <RSIPanel  data={displayed} />
            <MACDPanel data={displayed} />
          </div>
        )
      }
    </div>
  );
}
