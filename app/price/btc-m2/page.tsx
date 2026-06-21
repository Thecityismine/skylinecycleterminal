import { computeBtcM2 }     from '@/lib/indicators/btcM2';
import { BtcM2PageClient }  from '@/components/charts/BtcM2PageClient';
import { PageHeader }       from '@/components/dashboard/PageHeader';
import { StatCard }         from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export const revalidate = 86400;

function fmt(v: number | null, decimals = 2): string {
  if (v == null) return '—';
  return v.toFixed(decimals);
}

export default async function BtcM2Page() {
  let result: Awaited<ReturnType<typeof computeBtcM2>> | null = null;
  let fetchError = false;

  try {
    result = await computeBtcM2();
  } catch {
    fetchError = true;
  }

  const { ratio, ema200, ema400, sma52 } = result?.current ?? {
    ratio: null, ema200: null, ema400: null, sma52: null,
  };

  const zone = (() => {
    if (ratio == null || ema200 == null) return null;
    if (ratio > ema200 && ema400 != null && ratio > ema400) {
      return { label: 'Macro Bull — Above Both EMAs', color: '#35D07F',
        desc: 'BTC/M2 ratio is above both the 200 and 400 EMA — historically a strong bull cycle backdrop.' };
    }
    if (ratio > ema200) {
      return { label: 'Short-Term Bullish — Above 200 EMA', color: '#E6B450',
        desc: 'Ratio has reclaimed the 200 EMA but remains below the 400 EMA — recovering but not yet confirmed macro bull.' };
    }
    if (ema400 != null && ratio > ema400) {
      return { label: 'Below 200 EMA — Caution', color: '#F97316',
        desc: 'Ratio is between the 400 and 200 EMA — short-term weakness within a longer-term bull structure.' };
    }
    return { label: 'Below Both EMAs — Bear Territory', color: '#FF5C5C',
      desc: 'BTC/M2 ratio is below both EMAs — historically associated with bear market conditions.' };
  })();

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC / M2 Money Supply"
        subtitle="Weekly BTC price divided by US M2 — strips out monetary expansion to reveal true purchasing power momentum"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current Ratio"
          value={fmt(ratio)}
          sub="BTC price ÷ M2 (×1000)"
          accent="var(--sct-text)"
          freshness="daily"
        />
        <StatCard
          label="200 EMA"
          value={fmt(ema200)}
          sub={ratio != null && ema200 != null ? (ratio > ema200 ? '↑ Price above' : '↓ Price below') : '—'}
          accent="#35D07F"
        />
        <StatCard
          label="400 EMA"
          value={fmt(ema400)}
          sub={ratio != null && ema400 != null ? (ratio > ema400 ? '↑ Price above' : '↓ Price below') : '—'}
          accent="#FF5C5C"
        />
        <StatCard
          label="52-Week SMA"
          value={fmt(sma52)}
          sub="1-year simple average"
          accent="#E6B450"
        />
      </div>

      {/* Zone badge */}
      {zone && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: zone.color }}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: zone.color }}>{zone.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{zone.desc}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {fetchError ? (
        <div
          className="h-[480px] flex items-center justify-center rounded-xl border text-sm"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          Unable to load data — CoinMetrics or FRED API unreachable
        </div>
      ) : result ? (
        <BtcM2PageClient points={result.points} />
      ) : null}

      {/* Insight panel */}
      <InsightPanel title="Indicator Logic">
        <InsightRow
          label="What is BTC / M2?"
          value="Divides BTC's USD price by US M2 money supply (×1000). When M2 expands, the ratio stays flat even if BTC nominally rises — making real purchasing power momentum visible."
          stack
        />
        <InsightRow
          label="200 EMA Signal"
          value="The 200-week EMA of the ratio acts as the mid-cycle trend. Price reclaiming the 200 EMA historically signals the start of sustained bull runs."
          valueColor="#35D07F"
          stack
        />
        <InsightRow
          label="400 EMA Signal"
          value="The 400-week EMA is the macro baseline. Price above the 400 EMA confirms a structurally bullish environment. Extended time below it marks bear markets."
          valueColor="#FF5C5C"
          stack
        />
        <InsightRow
          label="52 SMA"
          value="1-year simple average of the ratio. Useful for identifying short-term mean reversion opportunities when ratio stretches far above or below."
          valueColor="#E6B450"
          stack
        />
        <InsightRow
          label="Source"
          value="BTC price: CoinMetrics Community API (daily, resampled to weekly) · M2: FRED series M2SL (monthly, forward-filled)"
          stack
        />
      </InsightPanel>
    </div>
  );
}
