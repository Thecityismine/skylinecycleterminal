"use client";

import { useState, useMemo } from 'react';
import { PreciousMetalChart } from '@/components/charts/PreciousMetalChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { MetalsShareModal } from '@/components/share/MetalsShareModal';
import {
  METAL_CONFIG,
  MACRO_QUADRANT_LABEL,
  MACRO_QUADRANT_COLOR,
} from '@/lib/indicators/metalTrend';
import type { Metal, MetalTrendResult } from '@/lib/indicators/metalTrend';

type Props = {
  goldResult: MetalTrendResult;
  silverResult: MetalTrendResult;
};

type Range = '1Y' | '2Y' | '5Y' | '10Y' | 'All';
const RANGES: Range[] = ['1Y', '2Y', '5Y', '10Y', 'All'];
const RANGE_DAYS: Record<Range, number> = {
  '1Y':  365,
  '2Y':  730,
  '5Y':  1825,
  '10Y': 3650,
  'All': Infinity,
};

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      <span className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>{label}</span>
    </div>
  );
}

const QUADRANT_NARRATIVE: Record<string, string> = {
  expansion:  'Strong trend combined with favorable macro conditions (weakening DXY and/or falling real yields). Historically the most productive environment for precious metals.',
  defensive:  'Metal is in a strong uptrend, but macro pressure (rising dollar or real yields) may limit the move. Watch for trend deterioration.',
  recovery:   'Macro environment is supportive (weakening dollar, falling real yields), but price is not yet trending clearly higher. Could be an early accumulation phase.',
  avoid:      'Weak trend combined with macro headwinds. Neither technical nor macro conditions favor new positions. Watch for improvement.',
};

export function PreciousMetalChartSection({ goldResult, silverResult }: Props) {
  const [metal,         setMetal]         = useState<Metal>('gold');
  const [range,         setRange]         = useState<Range>('10Y');
  const [show50W,       setShow50W]       = useState(true);
  const [show200W,      setShow200W]      = useState(true);
  const [showDXY,       setShowDXY]       = useState(false);
  const [showRealYield, setShowRealYield] = useState(false);
  const [logScale,      setLogScale]      = useState(false);

  const result = metal === 'gold' ? goldResult : silverResult;
  const { current } = result;
  const config = METAL_CONFIG[metal];

  const filteredData = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === Infinity) return result.chartData;
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    return result.chartData.filter(d => d.date >= cutoff);
  }, [result.chartData, range]);

  const sharePayload = useMemo(() => ({
    metal,
    chartData:   filteredData,
    current:     result.current,
    show50W,
    show200W,
    generatedAt: new Date().toISOString(),
  }), [metal, filteredData, result.current, show50W, show200W]);

  // Stat card helpers
  const priceStr = metal === 'gold'
    ? `$${current.price.toFixed(0)} / oz`
    : `$${current.price.toFixed(2)} / oz`;

  const change52wStr = current.change52w !== null
    ? `${current.change52w >= 0 ? '+' : ''}${current.change52w.toFixed(1)}%`
    : '—';
  const change52wAccent = current.change52w !== null
    ? (current.change52w >= 0 ? '#35D07F' : '#F85149')
    : 'var(--sct-muted)';

  const regimeStr = current.trendRegime === 'bullish' ? 'Bullish'
    : current.trendRegime === 'bearish' ? 'Bearish'
    : 'Neutral';
  const regimeAccent = current.trendRegime === 'bullish' ? '#35D07F'
    : current.trendRegime === 'bearish' ? '#F85149'
    : '#EAB84D';

  const dist50wStr = current.distFrom50w !== null
    ? `${current.distFrom50w >= 0 ? '+' : ''}${current.distFrom50w.toFixed(1)}%`
    : '—';
  const dist50wAccent = current.distFrom50w !== null
    ? (current.distFrom50w >= 0 ? '#35D07F' : current.distFrom50w < -5 ? '#F85149' : 'var(--sct-muted)')
    : 'var(--sct-muted)';
  const ma50wSub = current.ma50w !== null
    ? `50W MA: $${current.ma50w.toFixed(metal === 'gold' ? 0 : 2)}`
    : '50W MA: —';

  const gsRatioStr = current.goldSilverRatio !== null
    ? current.goldSilverRatio.toFixed(1)
    : '—';
  const gsRatioSub = current.goldSilverRatio !== null
    ? (current.goldSilverRatio > 90 ? 'Silver historically cheap vs Gold'
      : current.goldSilverRatio < 70 ? 'Silver relatively expensive vs Gold'
      : 'Ratio in mid-range')
    : 'Ratio unavailable';

  // Trend score color
  const trendScore = current.trendScore;
  const scoreColor = trendScore >= 75 ? '#EAB84D'
    : trendScore >= 50 ? '#35D07F'
    : trendScore >= 25 ? '#5B84FF'
    : '#8B949E';

  const valuationZone = trendScore < 25 ? 'Deep Discount'
    : trendScore < 50 ? 'Building / Attractive'
    : trendScore < 75 ? 'Healthy Trend'
    : 'Extended / Caution';

  // Macro quadrant
  const quadrant = current.macroQuadrant;
  const quadrantColor = MACRO_QUADRANT_COLOR[quadrant];
  const quadrantLabel = MACRO_QUADRANT_LABEL[quadrant];
  const narrative = QUADRANT_NARRATIVE[quadrant];
  const { dxyRegime } = current;

  return (
    <div className="space-y-6">
      {/* Metal tab switch */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMetal('gold')}
          className="px-4 py-1.5 rounded text-sm font-semibold border transition-all duration-150"
          style={{
            backgroundColor: metal === 'gold' ? 'rgba(234,184,77,0.15)' : 'transparent',
            borderColor:     metal === 'gold' ? '#EAB84D' : 'var(--sct-border)',
            color:           metal === 'gold' ? '#EAB84D' : 'var(--sct-muted)',
          }}
        >
          Gold (XAU)
        </button>
        <button
          onClick={() => setMetal('silver')}
          className="px-4 py-1.5 rounded text-sm font-semibold border transition-all duration-150"
          style={{
            backgroundColor: metal === 'silver' ? 'rgba(148,163,184,0.15)' : 'transparent',
            borderColor:     metal === 'silver' ? '#94A3B8' : 'var(--sct-border)',
            color:           metal === 'silver' ? '#94A3B8' : 'var(--sct-muted)',
          }}
        >
          Silver (XAG)
        </button>
      </div>

      {/* 4 Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={metal === 'gold' ? 'Gold Price' : 'Silver Price'}
          value={priceStr}
          sub={`52W: ${change52wStr}`}
          accent={config.accent}
          freshness="daily"
        />
        <StatCard
          label="vs 50W MA"
          value={dist50wStr}
          sub={ma50wSub}
          accent={dist50wAccent}
          freshness="daily"
        />
        <StatCard
          label="Trend Regime"
          value={regimeStr}
          sub={`Score: ${trendScore} / 100`}
          accent={regimeAccent}
          freshness="daily"
        />
        <StatCard
          label="Gold / Silver Ratio"
          value={gsRatioStr}
          sub={gsRatioSub}
          accent="#EAB84D"
          freshness="daily"
        />
      </div>

      {/* Main chart card */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--sct-border)' }}
        >
          {/* Range buttons */}
          <div className="flex items-center gap-1">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
                style={{
                  backgroundColor: range === r ? 'var(--sct-border)' : 'transparent',
                  borderColor:     'var(--sct-border)',
                  color:           range === r ? 'var(--sct-text)' : 'var(--sct-muted)',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, backgroundColor: 'var(--sct-border)' }} />

          {/* Toggle: 50W MA */}
          <button
            onClick={() => setShow50W(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: show50W ? 'rgba(234,184,77,0.12)' : 'transparent',
              borderColor:     show50W ? '#EAB84D' : 'var(--sct-border)',
              color:           show50W ? '#EAB84D' : 'var(--sct-muted)',
            }}
          >
            50W MA
          </button>

          {/* Toggle: 200W MA */}
          <button
            onClick={() => setShow200W(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: show200W ? 'rgba(91,132,255,0.12)' : 'transparent',
              borderColor:     show200W ? '#5B84FF' : 'var(--sct-border)',
              color:           show200W ? '#5B84FF' : 'var(--sct-muted)',
            }}
          >
            200W MA
          </button>

          {/* Toggle: DXY */}
          <button
            onClick={() => setShowDXY(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: showDXY ? 'rgba(230,237,243,0.08)' : 'transparent',
              borderColor:     showDXY ? 'rgba(230,237,243,0.4)' : 'var(--sct-border)',
              color:           showDXY ? 'rgba(230,237,243,0.7)' : 'var(--sct-muted)',
            }}
          >
            DXY
          </button>

          {/* Toggle: Real Yield */}
          <button
            onClick={() => setShowRealYield(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: showRealYield ? 'rgba(248,81,73,0.10)' : 'transparent',
              borderColor:     showRealYield ? 'rgba(248,81,73,0.50)' : 'var(--sct-border)',
              color:           showRealYield ? 'rgba(248,81,73,0.80)' : 'var(--sct-muted)',
            }}
          >
            Real Yield
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, backgroundColor: 'var(--sct-border)' }} />

          {/* Toggle: Log Scale */}
          <button
            onClick={() => setLogScale(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: logScale ? 'rgba(139,92,246,0.12)' : 'transparent',
              borderColor:     logScale ? 'rgba(139,92,246,0.50)' : 'var(--sct-border)',
              color:           logScale ? 'rgba(167,139,250,0.90)' : 'var(--sct-muted)',
            }}
          >
            LOG
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Legend */}
          <div className="flex items-center gap-3">
            <LegendDot color={config.accent} label={config.label} />
            {show50W && <LegendDot color="#EAB84D" label="50W MA" />}
            {show200W && <LegendDot color="#5B84FF" label="200W MA" />}
            {showDXY && <LegendDot color="rgba(230,237,243,0.5)" label="DXY" />}
            {showRealYield && <LegendDot color="rgba(248,81,73,0.6)" label="Real Yield" />}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, backgroundColor: 'var(--sct-border)' }} />

          {/* Share button (standard pattern) */}
          <MetalsShareModal payload={sharePayload} />
        </div>

        {/* Chart */}
        <div style={{ height: 480 }}>
          <PreciousMetalChart
            data={filteredData}
            metal={metal}
            show50W={show50W}
            show200W={show200W}
            showDXY={showDXY}
            showRealYield={showRealYield}
            logScale={logScale}
          />
        </div>
      </div>

      {/* Bottom two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trend Score + Valuation Zone */}
        <div
          className="rounded-lg border p-4 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              {metal === 'gold' ? 'Gold' : 'Silver'} Trend Score
            </h2>
            <span className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>
              {trendScore}
              <span className="text-sm font-normal" style={{ color: 'var(--sct-muted)' }}> / 100</span>
            </span>
          </div>

          {/* Score bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
            <div style={{ width: `${trendScore}%`, height: '100%', background: scoreColor, borderRadius: 999 }} />
          </div>

          {/* Valuation Zone label */}
          <div className="rounded p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Valuation Zone</p>
            <p className="text-sm font-semibold mt-1" style={{ color: scoreColor }}>
              {valuationZone}
            </p>
          </div>

          {/* Component breakdown */}
          {[
            { label: 'Price vs 50W MA',       weight: '30%' },
            { label: 'Price vs 200W MA',       weight: '25%' },
            { label: 'Distance from ATH',      weight: '15%' },
            { label: 'Gold/Silver Ratio',       weight: '15%' },
            { label: 'DXY Trend',               weight: '10%' },
            { label: '10Y Real Yield Trend',    weight: '5%' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--sct-muted)' }}>{row.label}</span>
              <span className="font-mono" style={{ color: 'var(--sct-muted)' }}>{row.weight}</span>
            </div>
          ))}
        </div>

        {/* Macro Quadrant + Context */}
        <div
          className="rounded-lg border p-4 space-y-4"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor: quadrantColor + '55',
            borderLeftWidth: 4,
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Macro Context</h2>
            <span
              className="px-2 py-1 rounded text-xs font-semibold"
              style={{ backgroundColor: quadrantColor + '20', color: quadrantColor }}
            >
              {quadrantLabel}
            </span>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            {narrative}
          </p>

          {/* Key metrics */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--sct-muted)' }}>DXY Direction</span>
              <span
                style={{
                  color: dxyRegime === 'falling' ? '#35D07F'
                    : dxyRegime === 'rising' ? '#F85149'
                    : 'var(--sct-muted)',
                }}
              >
                {dxyRegime === 'rising' ? 'Strengthening (headwind)'
                  : dxyRegime === 'falling' ? 'Weakening (tailwind)'
                  : 'Flat / Neutral'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--sct-muted)' }}>10Y Real Yield</span>
              <span style={{ color: 'var(--sct-text)' }}>
                {current.realYieldCurrent !== null ? `${current.realYieldCurrent.toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--sct-muted)' }}>Distance from ATH</span>
              <span
                style={{
                  color: current.drawdownFromAth !== null && current.drawdownFromAth > -5
                    ? '#35D07F'
                    : '#F85149',
                }}
              >
                {current.drawdownFromAth !== null ? `${current.drawdownFromAth.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--sct-muted)' }}>Macro Score</span>
              <span style={{ color: current.macroScore >= 60 ? '#F85149' : current.macroScore <= 40 ? '#35D07F' : 'var(--sct-muted)' }}>
                {current.macroScore} / 100
                {current.macroScore >= 60 ? ' (headwind)' : current.macroScore <= 40 ? ' (tailwind)' : ' (neutral)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
