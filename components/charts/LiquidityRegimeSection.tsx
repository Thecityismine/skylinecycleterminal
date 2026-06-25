"use client";

import { useState, useMemo, useCallback } from 'react';
import { ImageDown } from 'lucide-react';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import { LiquidityRegimePriceChart } from '@/components/charts/LiquidityRegimePriceChart';
import { LiquidityRegimeScoreChart } from '@/components/charts/LiquidityRegimeScoreChart';
import { LiquidityRegimeShareModal } from '@/components/share/LiquidityRegimeShareModal';
import type { LiquidityChartRow, LiquidityRegimeZone, LiquidityCurrentStats } from '@/lib/indicators/liquidityRegime';
import { REGIME_COLOR, REGIME_LABEL, REGIME_FILL } from '@/lib/indicators/liquidityRegime';
import type { LiquidityRegimeSharePayload } from '@/components/share/LiquidityRegimeShareCard';

type Props = {
  chartData: LiquidityChartRow[];
  zones:     LiquidityRegimeZone[];
  current:   LiquidityCurrentStats;
};

type Range = '1Y' | '2Y' | '3Y' | 'All';
const RANGES: Range[] = ['1Y', '2Y', '3Y', 'All'];
const DAYS: Record<Range, number> = { '1Y': 365, '2Y': 730, '3Y': 1095, 'All': Infinity };

function scoreBarColor(score: number): string {
  if (score >= 60) return '#35D07F';
  if (score >= 40) return '#EAB84D';
  return '#F85149';
}

// ── Inline subcomponents ──────────────────────────────────────────────────────

function MacroQuadrant({ current }: { current: LiquidityCurrentStats }) {
  const dotX = current.btcTrendAxis;
  const dotY = 100 - current.liquidityAxis;
  const regimeColor = REGIME_COLOR[current.regime];

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-[10px] font-mono tracking-widest uppercase mb-3 text-[var(--sct-muted)]">Macro Quadrant</p>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* 4 quadrant cells */}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
            <div style={{ borderRight: '1px solid rgba(139,148,158,0.25)', borderBottom: '1px solid rgba(139,148,158,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(139,148,158,0.5)', textAlign: 'center' }}>Recovery</span>
            </div>
            <div style={{ borderBottom: '1px solid rgba(139,148,158,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(53,208,127,0.04)' }}>
              <span style={{ fontSize: 10, color: 'rgba(53,208,127,0.6)', textAlign: 'center' }}>Expansion</span>
            </div>
            <div style={{ borderRight: '1px solid rgba(139,148,158,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,81,73,0.04)' }}>
              <span style={{ fontSize: 10, color: 'rgba(248,81,73,0.6)', textAlign: 'center' }}>Defensive</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(139,148,158,0.5)', textAlign: 'center' }}>Transition</span>
            </div>
          </div>
          {/* Axis labels */}
          <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: 'rgba(139,148,158,0.4)', whiteSpace: 'nowrap' }}>
            High Liquidity
          </div>
          <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: 'rgba(139,148,158,0.4)', whiteSpace: 'nowrap' }}>
            Tight Liquidity
          </div>
          <div style={{ position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: 8, color: 'rgba(139,148,158,0.4)', whiteSpace: 'nowrap' }}>
            Weak Trend
          </div>
          <div style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 8, color: 'rgba(139,148,158,0.4)', whiteSpace: 'nowrap' }}>
            Strong Trend
          </div>
          {/* Live dot */}
          <div style={{
            position:    'absolute',
            left:        `${dotX}%`,
            top:         `${dotY}%`,
            transform:   'translate(-50%, -50%)',
            width:       12,
            height:      12,
            borderRadius: '50%',
            backgroundColor: regimeColor,
            boxShadow:   `0 0 8px ${regimeColor}`,
          }} />
        </div>
      </div>
      <p className="text-[10px] mt-3 text-center" style={{ color: regimeColor }}>
        {current.quadrant.charAt(0).toUpperCase() + current.quadrant.slice(1)}
      </p>
    </div>
  );
}

function RiskPostureCard({ current }: { current: LiquidityCurrentStats }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-[10px] font-mono tracking-widest uppercase mb-2 text-[var(--sct-muted)]">Risk Posture</p>
      <p className="text-sm font-semibold mb-1" style={{ color: REGIME_COLOR[current.regime] }}>
        {REGIME_LABEL[current.regime]}
      </p>
      <p className="text-xs text-[var(--sct-text)] leading-relaxed">{current.riskPosture}</p>
    </div>
  );
}

function ComponentBreakdownCard({ current }: { current: LiquidityCurrentStats }) {
  const fmtPct = (v: number | null, decimals = 1): string => {
    if (v == null) return '—';
    return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`;
  };
  const fmtPp = (v: number | null): string => {
    if (v == null) return '—';
    return `${v >= 0 ? '+' : ''}${v.toFixed(2)}pp`;
  };

  const rows: Array<{ label: string; raw: string; score: number; weight: string }> = [
    {
      label:  'Fed Balance Sheet',
      raw:    fmtPct(current.fedBalanceYoY) + ' YoY',
      score:  current.globalLiqScore,
      weight: '30%',
    },
    {
      label:  'DXY',
      raw:    fmtPct(current.dxyChange90d) + ' (90d)',
      score:  current.dxyScore,
      weight: '20%',
    },
    {
      label:  '10Y Real Yield',
      raw:    fmtPp(current.realYieldChange90d) + ' (90d)',
      score:  current.realYieldScore,
      weight: '20%',
    },
    {
      label:  'M2 Growth',
      raw:    fmtPct(current.m2YoY) + ' YoY',
      score:  current.m2Score,
      weight: '15%',
    },
    {
      label:  'Stablecoin Supply',
      raw:    fmtPct(current.stablecoin30d) + ' (30d)',
      score:  current.stablecoinScore,
      weight: '10%',
    },
    {
      label:  'BTC Trend',
      raw:    current.btcTrendScore >= 100 ? 'Above both MAs' : current.btcTrendScore >= 50 ? 'Above 100W MA' : 'Below 100W MA',
      score:  current.btcTrendScore,
      weight: '5%',
    },
  ];

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-[10px] font-mono tracking-widest uppercase mb-3 text-[var(--sct-muted)]">Component Breakdown</p>
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono pb-1" style={{ borderBottom: '1px solid var(--sct-border)', color: 'var(--sct-muted)' }}>
          <span>Component</span>
          <span>Raw Value</span>
          <span>Score</span>
          <span>Weight</span>
        </div>
        {rows.map(row => (
          <div key={row.label} className="grid grid-cols-4 gap-2 items-center text-xs">
            <span className="font-mono text-[11px]" style={{ color: 'var(--sct-secondary)' }}>{row.label}</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--sct-muted)' }}>{row.raw}</span>
            <div className="flex items-center gap-1.5">
              <div style={{ width: 40, height: 4, backgroundColor: 'var(--sct-border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${row.score}%`, height: '100%', backgroundColor: scoreBarColor(row.score), borderRadius: 2 }} />
              </div>
              <span className="font-mono text-[11px]" style={{ color: 'var(--sct-text)' }}>{Math.round(row.score)}</span>
            </div>
            <span className="font-mono text-[11px]" style={{ color: 'var(--sct-muted)' }}>{row.weight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function LiquidityRegimeSection({ chartData, zones, current }: Props) {
  const [range,          setRange]         = useState<Range>('2Y');
  const [showMA100w,     setShowMA100w]    = useState(true);
  const [showMA200w,     setShowMA200w]    = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareHovered,   setShareHovered]  = useState(false);

  const { domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers } = useChartZoom<string>();

  const displayedData = useMemo(() => {
    const days = DAYS[range];
    let filtered = days === Infinity
      ? chartData
      : chartData.filter(d => {
          const ms = new Date(d.date + 'T00:00:00').getTime();
          return ms >= Date.now() - days * 86_400_000;
        });
    if (domain) {
      filtered = filtered.filter(d => d.date >= domain.start && d.date <= domain.end);
    }
    return filtered;
  }, [chartData, range, domain]);

  const displayedZones = useMemo(() => {
    if (!displayedData.length) return zones;
    const first = displayedData[0].date;
    const last  = displayedData[displayedData.length - 1].date;
    return zones
      .filter(z => z.end >= first && z.start <= last)
      .map(z => ({
        ...z,
        start: z.start < first ? first : z.start,
        end:   z.end   > last  ? last  : z.end,
      }));
  }, [zones, displayedData]);

  const handleRangeChange = useCallback((r: Range) => {
    setRange(r);
    reset();
  }, [reset]);

  const sharePayload: LiquidityRegimeSharePayload = useMemo(() => {
    const last2Y = chartData.filter(d => {
      const ms = new Date(d.date + 'T00:00:00').getTime();
      return ms >= Date.now() - 730 * 86_400_000;
    });
    return {
      chartData:   last2Y,
      zones,
      current,
      generatedAt: new Date().toISOString(),
    };
  }, [chartData, zones, current]);

  // Suppress unused import warning — REGIME_FILL is used via prop drilling to charts
  void REGIME_FILL;

  return (
    <div className="space-y-4">
      {/* Top chart card */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>BTC Price — Liquidity Regime</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>Regime background: green=supportive, amber=mixed, red=restrictive</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => handleRangeChange(r)}
                className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
                style={{
                  backgroundColor: range === r && !isZoomed ? 'var(--sct-border)' : 'transparent',
                  borderColor:     'var(--sct-border)',
                  color:           range === r && !isZoomed ? 'var(--sct-text)' : 'var(--sct-muted)',
                }}
              >
                {r}
              </button>
            ))}
            <button
              onClick={() => setShowMA100w(v => !v)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: showMA100w ? 'rgba(230,180,80,0.12)' : 'transparent',
                borderColor:     showMA100w ? '#E6B450' : 'var(--sct-border)',
                color:           showMA100w ? '#E6B450' : 'var(--sct-muted)',
              }}
            >
              100W MA
            </button>
            <button
              onClick={() => setShowMA200w(v => !v)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: showMA200w ? 'rgba(91,132,255,0.12)' : 'transparent',
                borderColor:     showMA200w ? '#5B84FF' : 'var(--sct-border)',
                color:           showMA200w ? '#5B84FF' : 'var(--sct-muted)',
              }}
            >
              200W MA
            </button>
            {isZoomed ? (
              <button
                onClick={reset}
                className="px-3 py-1 rounded text-xs font-mono border transition-all"
                style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}
              >
                Reset Zoom
              </button>
            ) : (
              <span className="hidden md:inline text-[10px] font-mono ml-1" style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
                drag to zoom
              </span>
            )}
            <button
              onClick={() => setShowShareModal(true)}
              onMouseEnter={() => setShareHovered(true)}
              onMouseLeave={() => setShareHovered(false)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: 'transparent',
                borderColor:     'var(--sct-border)',
                color:           shareHovered ? '#F7931A' : 'var(--sct-muted)',
              }}
            >
              <ImageDown size={13} />
              Share Card
            </button>
          </div>
        </div>

        <LiquidityRegimePriceChart
          data={displayedData}
          zones={displayedZones}
          showMA100w={showMA100w}
          showMA200w={showMA200w}
          isSelecting={isSelecting}
          selectionArea={selectionArea}
          chartHandlers={chartHandlers}
          cancel={cancel}
        />
      </div>

      {/* Score chart card */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--sct-text)' }}>Composite Liquidity Regime Score</p>
        <p className="text-xs mb-4" style={{ color: 'var(--sct-muted)' }}>0–100 · dim BTC line for context</p>
        <LiquidityRegimeScoreChart data={displayedData} />
      </div>

      {/* Bottom: Quadrant + Risk Posture + Component Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MacroQuadrant current={current} />
        <div className="md:col-span-2 space-y-4">
          <RiskPostureCard current={current} />
          <ComponentBreakdownCard current={current} />
        </div>
      </div>

      {showShareModal && (
        <LiquidityRegimeShareModal payload={sharePayload} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
