"use client";

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ImageDown } from 'lucide-react';
import { BTCGoldenDeathCrossChart } from '@/components/charts/BTCGoldenDeathCrossChart';
import { MASpreadChart } from '@/components/charts/MASpreadChart';
import { GoldenDeathCrossShareModal } from '@/components/share/GoldenDeathCrossShareModal';
import { REGIMES } from '@/lib/indicators/goldenDeathCross';
import { useApiData } from '@/lib/hooks/useApiData';
import type { CrossEvent, CrossRegime } from '@/lib/indicators/goldenDeathCross';

// ── API response type ─────────────────────────────────────────────────────────
type ChartPoint = {
  time:   string;
  ts:     number;
  price:  number;
  ma50:   number | null;
  ma200:  number | null;
  spread: number | null;
};

type CurrentMetrics = {
  price:             number;
  ma50:              number | null;
  ma200:             number | null;
  spread:            number | null;
  slope50:           number | null;
  slope200:          number | null;
  regime:            CrossRegime;
  confidence:        number;
  daysSinceLastCross:number | null;
  lastCrossType:     'golden' | 'death' | null;
  lastCrossDate:     string | null;
  return90d:         number | null;
  priceVsMa50:       number | null;
  priceVsMa200:      number | null;
};

type ApiResponse = {
  current:       CurrentMetrics;
  chartDaily:    ChartPoint[];
  chartWeekly:   ChartPoint[];
  crossEvents:   CrossEvent[];
  weeklyCrosses: CrossEvent[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(v: number | null, plus = false): string {
  if (v === null) return '—';
  return `${plus && v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

// ── Range config ──────────────────────────────────────────────────────────────
type RangeKey = '1Y' | '2Y' | '4Y' | 'All';
const RANGES: { key: RangeKey; label: string; ms: number }[] = [
  { key: '1Y',  label: '1Y',  ms: 365   * 86400_000 },
  { key: '2Y',  label: '2Y',  ms: 730   * 86400_000 },
  { key: '4Y',  label: '4Y',  ms: 1461  * 86400_000 },
  { key: 'All', label: 'All', ms: 0 },
];

type TimeframeKey = 'daily' | 'weekly';

// ── Small UI atoms ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color, border,
}: {
  label:   string;
  value:   string;
  sub?:    string;
  color?:  string;
  border?: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg border p-3.5"
      style={{
        backgroundColor: 'var(--sct-card)',
        borderColor:      border ?? 'var(--sct-border)',
        borderLeftWidth:  border ? 3 : undefined,
      }}
    >
      <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--sct-muted)' }}>
        {label}
      </span>
      <span className="text-xl font-bold font-mono" style={{ color: color ?? 'var(--sct-text)' }}>
        {value}
      </span>
      {sub && <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>{sub}</span>}
    </div>
  );
}

function RangeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
      style={{
        backgroundColor: active ? 'var(--sct-border)' : 'transparent',
        borderColor:     'var(--sct-border)',
        color:           active ? 'var(--sct-text)' : 'var(--sct-muted)',
      }}
    >
      {label}
    </button>
  );
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
      style={{
        backgroundColor: active ? 'var(--sct-border)' : 'transparent',
        borderColor:     'var(--sct-border)',
        color:           active ? 'var(--sct-text)' : 'var(--sct-muted)',
      }}
    >
      {label}
    </button>
  );
}

// ── Cross history table ───────────────────────────────────────────────────────
function CrossTable({ events }: { events: CrossEvent[] }) {
  const sorted = [...events].reverse();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
            {['Date', 'Type', 'Price', '50D MA', '200D MA', 'Confirmed', '90D Return'].map((h) => (
              <th key={h} className="pb-2 pr-4 text-left text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((ev) => {
            const isGolden = ev.type === 'golden';
            const ret      = ev.return90d;
            return (
              <tr key={`${ev.type}-${ev.ts}`} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                <td className="py-2 pr-4 font-mono text-xs" style={{ color: 'var(--sct-muted)' }}>{ev.time}</td>
                <td className="py-2 pr-4">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      background: isGolden ? 'rgba(53,208,127,0.15)' : 'rgba(248,81,73,0.15)',
                      color:      isGolden ? '#35D07F' : '#F85149',
                    }}
                  >
                    {isGolden ? 'Golden' : 'Death'}
                  </span>
                </td>
                <td className="py-2 pr-4 font-mono text-xs" style={{ color: 'var(--sct-text)' }}>{fmtPrice(ev.price)}</td>
                <td className="py-2 pr-4 font-mono text-xs" style={{ color: '#EAB84D' }}>{fmtPrice(ev.ma50)}</td>
                <td className="py-2 pr-4 font-mono text-xs" style={{ color: '#5B84FF' }}>{fmtPrice(ev.ma200)}</td>
                <td className="py-2 pr-4 text-xs">
                  {ev.confirmed
                    ? <span style={{ color: '#35D07F' }}>Yes</span>
                    : <span style={{ color: '#F85149' }}>No</span>}
                </td>
                <td className="py-2 font-mono text-xs font-semibold" style={{
                  color: (ret === null || ret === undefined) ? 'var(--sct-muted)' : ret >= 0 ? '#35D07F' : '#F85149',
                }}>
                  {(ret === null || ret === undefined) ? 'Pending' : fmtPct(ret ?? null, true)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Confidence bar ─────────────────────────────────────────────────────────────
function ConfidenceBar({ score, isGolden }: { score: number; isGolden: boolean }) {
  const color = score >= 65 ? '#35D07F' : score >= 40 ? '#E6B450' : '#F85149';
  const label = score >= 75 ? 'Strong signal' : score >= 55 ? 'Moderate' : score >= 40 ? 'Weak' : 'Low confidence';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--sct-text)' }}>Trend Confidence</span>
        <span className="text-sm font-bold font-mono" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>
      <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>
        {isGolden ? 'Bull' : 'Bear'} trend strength: {label}
      </p>
    </div>
  );
}

// ── Signal component ───────────────────────────────────────────────────────────
function SlopeIndicator({ value, label }: { value: number | null; label: string }) {
  if (value === null) return null;
  const pos = value >= 0;
  const Icon = pos ? TrendingUp : value === 0 ? Minus : TrendingDown;
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} style={{ color: pos ? '#35D07F' : '#F85149' }} />
      <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>{label}:</span>
      <span className="text-xs font-mono font-semibold" style={{ color: pos ? '#35D07F' : '#F85149' }}>
        {fmtPct(value, true)}/30d
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GoldenDeathCrossPage() {
  const { data, loading, error } = useApiData<ApiResponse>('/api/price/golden-death-cross');

  const [range,     setRange]     = useState<RangeKey>('2Y');
  const [timeframe, setTimeframe] = useState<TimeframeKey>('daily');
  const [logScale,  setLogScale]  = useState(true);
  const [showHalv,  setShowHalv]  = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const rangeMs = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    return r.ms === 0 ? 0 : r.ms;
  }, [range]);

  const startTs = useMemo(() => {
    if (rangeMs === 0) return 0;
    return Date.now() - rangeMs;
  }, [rangeMs]);

  const chartPoints = useMemo(() => {
    if (!data) return [];
    return timeframe === 'daily' ? data.chartDaily : data.chartWeekly;
  }, [data, timeframe]);

  const crossEvents = useMemo(() => {
    if (!data) return [];
    return timeframe === 'daily' ? data.crossEvents : data.weeklyCrosses;
  }, [data, timeframe]);

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading || !data) {
    return (
      <div className="space-y-4 p-6 animate-pulse">
        <div className="h-8 w-72 rounded" style={{ backgroundColor: 'var(--sct-card)' }} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg" style={{ backgroundColor: 'var(--sct-card)' }} />
          ))}
        </div>
        <div className="h-96 rounded-lg" style={{ backgroundColor: 'var(--sct-card)' }} />
        <div className="h-28 rounded-lg" style={{ backgroundColor: 'var(--sct-card)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p style={{ color: '#F85149' }}>Failed to load data: {error}</p>
      </div>
    );
  }

  const { current } = data;
  const ri          = REGIMES[current.regime as CrossRegime];
  const isGolden    = (current.regime as string).startsWith('golden');

  // ── Share payload ─────────────────────────────────────────────────────────
  const sharePayload = {
    chartPoints:    chartPoints.filter((p: ChartPoint) => p.ts >= startTs),
    crossEvents,
    startTs,
    price:          current.price,
    ma50:           current.ma50,
    ma200:          current.ma200,
    spread:         current.spread,
    regime:         current.regime,
    confidence:     current.confidence,
    daysSinceCross: current.daysSinceLastCross,
    lastCrossType:  current.lastCrossType,
    lastCrossDate:  current.lastCrossDate,
    logScale,
    rangeLabel:     range,
    generatedAt:    new Date().toISOString().slice(0, 10),
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-[1200px]">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--sct-text)' }}>
          BTC Golden / Death Cross
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sct-muted)' }}>
          50-day and 200-day moving average crossover signals — daily or weekly timeframe
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="BTC Price"
          value={fmtPrice(current.price)}
          color="#F7931A"
        />
        <StatCard
          label={timeframe === 'daily' ? '50D MA' : '10W MA'}
          value={current.ma50 ? fmtPrice(current.ma50) : '—'}
          sub={current.priceVsMa50 !== null ? `Price: ${fmtPct(current.priceVsMa50, true)} vs MA` : undefined}
          color="#EAB84D"
        />
        <StatCard
          label={timeframe === 'daily' ? '200D MA' : '40W MA'}
          value={current.ma200 ? fmtPrice(current.ma200) : '—'}
          sub={current.priceVsMa200 !== null ? `Price: ${fmtPct(current.priceVsMa200, true)} vs MA` : undefined}
          color="#5B84FF"
        />
        <StatCard
          label="MA Spread"
          value={current.spread !== null ? `${current.spread > 0 ? '+' : ''}${current.spread.toFixed(1)}%` : '—'}
          sub="(50D − 200D) / 200D"
          color={(current.spread ?? 0) >= 0 ? '#35D07F' : '#F85149'}
        />
        <StatCard
          label="Regime"
          value={ri.shortLabel}
          sub={current.daysSinceLastCross !== null ? `${current.daysSinceLastCross}d since last cross` : undefined}
          color={ri.color}
          border={ri.color}
        />
      </div>

      {/* Main chart */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        {/* Chart toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--sct-border)' }}>
          {/* Timeframe toggle */}
          <div className="flex items-center gap-1 rounded p-0.5" style={{ backgroundColor: 'var(--sct-panel)', border: '1px solid var(--sct-border)' }}>
            <ToggleButton active={timeframe === 'daily'}  onClick={() => setTimeframe('daily')}  label="Daily 50D/200D" />
            <ToggleButton active={timeframe === 'weekly'} onClick={() => setTimeframe('weekly')} label="Weekly 10W/40W" />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 ml-2">
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--sct-muted)' }}>
              <span style={{ width: 16, height: 2, background: '#EAB84D', display: 'inline-block', borderRadius: 1 }} />
              {timeframe === 'daily' ? '50D MA' : '10W MA'}
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--sct-muted)' }}>
              <span style={{ width: 16, height: 2, background: '#5B84FF', display: 'inline-block', borderRadius: 1 }} />
              {timeframe === 'daily' ? '200D MA' : '40W MA'}
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--sct-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#35D07F', display: 'inline-block' }} />
              Golden
            </span>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--sct-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F85149', display: 'inline-block' }} />
              Death
            </span>
          </div>

          <div className="flex-1" />

          {/* Range buttons */}
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <RangeButton key={r.key} label={r.label} active={range === r.key} onClick={() => setRange(r.key)} />
            ))}
          </div>

          {/* Log toggle */}
          <button
            onClick={() => setLogScale((v) => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: logScale ? 'var(--sct-border)' : 'transparent',
              borderColor:     'var(--sct-border)',
              color:           logScale ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            Log
          </button>

          {/* Halvings toggle */}
          <button
            onClick={() => setShowHalv((v) => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: showHalv ? 'var(--sct-border)' : 'transparent',
              borderColor:     'var(--sct-border)',
              color:           showHalv ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            Halvings
          </button>

          {/* Share button */}
          <button
            onClick={() => setShowShareModal(true)}
            disabled={!chartPoints.length}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all border"
            style={{
              backgroundColor: 'transparent',
              borderColor:     'var(--sct-border)',
              color:           'var(--sct-muted)',
              cursor:          !chartPoints.length ? 'not-allowed' : 'pointer',
              opacity:         !chartPoints.length ? 0.4 : 1,
            }}
            onMouseEnter={(e) => {
              if (!chartPoints.length) return;
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#F7931A';
              (e.currentTarget as HTMLButtonElement).style.color = '#F7931A';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sct-border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--sct-muted)';
            }}
          >
            <ImageDown size={12} />
            Share Card
          </button>
        </div>

        {/* Main price chart */}
        <div style={{ height: 400 }}>
          <BTCGoldenDeathCrossChart
            data={chartPoints}
            crossEvents={crossEvents}
            logScale={logScale}
            startTs={startTs}
            showHalvings={showHalv}
          />
        </div>

        {/* MA Spread sub-panel */}
        <div style={{ borderTop: '1px solid var(--sct-border)', padding: '6px 0 4px' }}>
          <p className="px-4 pb-1 text-[9px] uppercase tracking-widest font-medium" style={{ color: 'var(--sct-muted)' }}>
            MA Spread · (50D − 200D) / 200D × 100%
          </p>
          <div style={{ height: 120 }}>
            <MASpreadChart data={chartPoints} startTs={startTs} />
          </div>
        </div>
      </div>

      {/* False Cross Risk + Confidence */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* False Cross Risk Panel */}
        <div className="rounded-lg border p-4 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>False Cross Risk</h2>

          <ConfidenceBar score={current.confidence} isGolden={isGolden} />

          <div className="space-y-2.5">
            <SlopeIndicator value={current.slope50}  label={timeframe === 'daily' ? '50D MA slope' : '10W MA slope'} />
            <SlopeIndicator value={current.slope200} label={timeframe === 'daily' ? '200D MA slope' : '40W MA slope'} />

            <div className="flex items-center gap-1.5">
              {(current.return90d ?? 0) >= 0
                ? <TrendingUp  size={12} style={{ color: '#35D07F' }} />
                : <TrendingDown size={12} style={{ color: '#F85149' }} />}
              <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>90D momentum:</span>
              <span className="text-xs font-mono font-semibold" style={{ color: (current.return90d ?? 0) >= 0 ? '#35D07F' : '#F85149' }}>
                {fmtPct(current.return90d, true)}
              </span>
            </div>
          </div>

          <div className="rounded p-3 text-xs leading-relaxed" style={{ backgroundColor: 'var(--sct-panel)', color: 'var(--sct-muted)' }}>
            <strong style={{ color: ri.color }}>Current posture:</strong> {ri.posture}
          </div>
        </div>

        {/* Current regime panel */}
        <div
          className="rounded-lg border p-4 space-y-3"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor:     ri.color + '55',
            borderLeftWidth: 4,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: ri.color }}>{ri.label}</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{ri.description}</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>Price vs 50D MA</p>
              <p className="text-lg font-bold font-mono" style={{ color: (current.priceVsMa50 ?? 0) >= 0 ? '#35D07F' : '#F85149' }}>
                {fmtPct(current.priceVsMa50, true)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>Price vs 200D MA</p>
              <p className="text-lg font-bold font-mono" style={{ color: (current.priceVsMa200 ?? 0) >= 0 ? '#35D07F' : '#F85149' }}>
                {fmtPct(current.priceVsMa200, true)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>MA Spread</p>
              <p className="text-lg font-bold font-mono" style={{ color: (current.spread ?? 0) >= 0 ? '#35D07F' : '#F85149' }}>
                {fmtPct(current.spread, true)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>Days Since Cross</p>
              <p className="text-lg font-bold font-mono" style={{ color: 'var(--sct-text)' }}>
                {current.daysSinceLastCross !== null ? current.daysSinceLastCross : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical cross table */}
      <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Historical Crosses — {timeframe === 'daily' ? '50D / 200D Daily' : '10W / 40W Weekly'}
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--sct-panel)', color: 'var(--sct-muted)' }}>
            {crossEvents.length} events
          </span>
        </div>
        <CrossTable events={crossEvents} />
      </div>

      {/* Regime guide */}
      <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>Regime Guide</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(REGIMES).map((r) => (
            <div
              key={r.key}
              className="rounded-lg p-3 border"
              style={{
                backgroundColor: r.color + '08',
                borderColor:     r.color + '33',
                borderLeftWidth: 3,
              }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: r.color }}>{r.label}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{r.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology */}
      <div className="rounded-lg border p-4 text-xs leading-relaxed space-y-2" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Methodology</h2>
        <p>
          The <strong style={{ color: 'var(--sct-text)' }}>Golden Cross</strong> occurs when the 50-day SMA crosses above the 200-day SMA, signaling a potential trend shift from bearish to bullish. The <strong style={{ color: 'var(--sct-text)' }}>Death Cross</strong> is the inverse — 50D crossing below 200D.
        </p>
        <p>
          A cross is marked <strong style={{ color: 'var(--sct-text)' }}>Confirmed</strong> if the crossover relationship is maintained 10 days later. False crosses occur when both MAs are nearly equal (Neutral/Compression regime) and a brief divergence reverses quickly.
        </p>
        <p>
          The <strong style={{ color: 'var(--sct-text)' }}>MA Spread</strong> = ((50D MA − 200D MA) / 200D MA) × 100. Positive values indicate a golden cross regime; negative values indicate a death cross regime. A rapidly expanding spread increases conviction; a compressing spread from an extended regime warns of a potential reversal.
        </p>
        <p>
          <strong style={{ color: 'var(--sct-text)' }}>Trend Confidence Score</strong> is a composite of: price vs 200D MA (35%), 50D slope over 30 days (25%), 200D slope over 30 days (20%), spread magnitude (10%), and 90-day price momentum (10%).
        </p>
        <p>
          <strong style={{ color: 'var(--sct-text)' }}>Weekly mode</strong> uses 10-week (10W) and 40-week (40W) SMAs, which smooth out daily volatility and produce fewer, higher-conviction signals.
        </p>
        <p>Price data sourced from CoinMetrics Community API. Updated daily.</p>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <GoldenDeathCrossShareModal
          payload={sharePayload}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
