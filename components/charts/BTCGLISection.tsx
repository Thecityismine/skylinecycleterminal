"use client";

import { useState, useMemo, useCallback } from 'react';
import { ImageDown } from 'lucide-react';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { PricePoint } from '@/lib/api/coinmetrics';
import { BTCGLILagChart } from '@/components/charts/BTCGLILagChart';
import { GLIMomentumChart } from '@/components/charts/GLIMomentumChart';
import { GLILagOptimizerPanel } from '@/components/panels/GLILagOptimizerPanel';
import { GLIMacroReadPanel } from '@/components/panels/GLIMacroReadPanel';
import { BTCGLIShareModal } from '@/components/share/BTCGLIShareModal';
import type { BTCGLISharePayload } from '@/components/share/BTCGLIShareCard';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  computeBTCGliLag, buildPhaseZones, LAG_PRESETS,
  SIGNAL_COLOR, SIGNAL_LABEL,
} from '@/lib/indicators/gliLag';
import type { GliPoint } from '@/lib/indicators/gliLag';

type Range = '1Y' | '2Y' | '4Y' | 'All';
const RANGES: Range[] = ['1Y', '2Y', '4Y', 'All'];
const DAYS: Record<Range, number> = { '1Y': 365, '2Y': 730, '4Y': 1460, 'All': Infinity };

function fmtPrice(v: number | null): string {
  if (v == null) return '—';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

type Props = {
  btcPrices: PricePoint[];
  gliRaw:    GliPoint[];
};

export function BTCGLISection({ btcPrices, gliRaw }: Props) {
  const [range,             setRange]             = useState<Range>('4Y');
  const [lagDays,            setLagDays]           = useState<number>(75);
  const [showRaw,            setShowRaw]           = useState(false);
  const [showTurningPoints,  setShowTurningPoints] = useState(true);
  const [showPhases,         setShowPhases]        = useState(true);
  const [showMomentum,       setShowMomentum]      = useState(true);
  const [showShareModal,     setShowShareModal]    = useState(false);
  const [shareHovered,       setShareHovered]      = useState(false);

  const { domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers } = useChartZoom<string>();

  const result = useMemo(
    () => computeBTCGliLag(btcPrices, gliRaw, lagDays),
    [btcPrices, gliRaw, lagDays],
  );

  const phaseZones = useMemo(() => buildPhaseZones(result.turningPoints), [result.turningPoints]);

  const displayedRows = useMemo(() => {
    const days = DAYS[range];
    let filtered = days === Infinity
      ? result.rows
      : result.rows.filter(r => r.ts >= Date.now() - days * 86_400_000);
    if (domain) {
      filtered = filtered.filter(r => r.time >= domain.start && r.time <= domain.end);
    }
    return filtered;
  }, [result.rows, range, domain]);

  const displayedZones = useMemo(() => {
    if (!displayedRows.length) return phaseZones;
    const first = displayedRows[0].time;
    const last  = displayedRows[displayedRows.length - 1].time;
    return phaseZones
      .filter(z => z.end >= first && z.start <= last)
      .map(z => ({ ...z, start: z.start < first ? first : z.start, end: z.end > last ? last : z.end }));
  }, [phaseZones, displayedRows]);

  const handleRangeChange = useCallback((r: Range) => { setRange(r); reset(); }, [reset]);

  const sharePayload: BTCGLISharePayload = useMemo(() => ({
    rows:          displayedRows,
    turningPoints: result.turningPoints,
    phaseZones:    displayedZones,
    current:       result.current,
    rangeLabel:    isZoomed ? 'Zoomed' : range,
    generatedAt:   new Date().toISOString(),
  }), [displayedRows, result.turningPoints, displayedZones, result.current, range, isZoomed]);

  const { current } = result;
  const confidenceColor = current.confidence === 'High' ? '#35D07F' : current.confidence === 'Moderate' ? '#E6B450' : '#8B949E';

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="BTC Price" value={fmtPrice(current.btcPrice)} sub="Latest close" accent="#F7931A" freshness="daily" />
        <StatCard label="GLI (Shifted)" value={current.gli != null ? current.gli.toFixed(1) : '—'} sub={`${current.gliTrend} phase`} accent="var(--sct-text)" freshness="daily" />
        <StatCard label="Active Lag" value={`${current.lagDays}D`} sub="Forward shift" accent="var(--sct-text)" />
        <StatCard
          label="90D Correlation"
          value={current.correlation90d != null ? current.correlation90d.toFixed(2) : '—'}
          sub={current.correlation90d != null ? (current.correlation90d >= 0.3 ? 'Aligned' : current.correlation90d <= -0.3 ? 'Inverted' : 'Weak') : 'Insufficient data'}
          accent={current.correlation90d != null ? (current.correlation90d >= 0.3 ? '#35D07F' : current.correlation90d <= -0.3 ? '#F85149' : '#E6B450') : 'var(--sct-muted)'}
        />
        <StatCard label="Signal" value={SIGNAL_LABEL[current.signal]} sub="Lead/lag read" accent={SIGNAL_COLOR[current.signal]} />
        <StatCard label="Model Confidence" value={current.confidence} sub="Based on |correlation|" accent={confidenceColor} />
      </div>

      {/* Main chart card */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>BTC vs Global Liquidity Index</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Orange = BTC price (log, left axis) · White = GLI shifted forward {lagDays}D (right axis, 0–100)
            </p>
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

            <span className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--sct-border)' }} />

            {LAG_PRESETS.map(l => (
              <button
                key={l}
                onClick={() => setLagDays(l)}
                className="px-2.5 py-1 rounded text-xs font-mono border transition-all duration-150"
                style={{
                  backgroundColor: lagDays === l ? 'rgba(247,147,26,0.12)' : 'transparent',
                  borderColor:     lagDays === l ? '#F7931A' : 'var(--sct-border)',
                  color:           lagDays === l ? '#F7931A' : 'var(--sct-muted)',
                }}
              >
                {l}D
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={180}
              value={lagDays}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) setLagDays(Math.min(180, Math.max(1, Math.round(v))));
              }}
              title="Custom lag (days)"
              className="w-14 px-2 py-1 rounded text-xs font-mono border bg-transparent text-center"
              style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
            />

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
              style={{ backgroundColor: 'transparent', borderColor: 'var(--sct-border)', color: shareHovered ? '#F7931A' : 'var(--sct-muted)' }}
            >
              <ImageDown size={13} />
              Share Card
            </button>
          </div>
        </div>

        {/* Overlay toggles */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {[
            { key: 'raw', label: 'GLI Raw', active: showRaw, set: setShowRaw, color: '#8B949E' },
            { key: 'phases', label: 'Rising/Falling Phases', active: showPhases, set: setShowPhases, color: '#35D07F' },
            { key: 'turning', label: 'Turning Points', active: showTurningPoints, set: setShowTurningPoints, color: '#FDE047' },
            { key: 'momentum', label: 'Momentum Panel', active: showMomentum, set: setShowMomentum, color: '#5B84FF' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => t.set(v => !v)}
              className="px-2.5 py-1 rounded text-[11px] font-mono border transition-all duration-150"
              style={{
                backgroundColor: t.active ? `${t.color}20` : 'transparent',
                borderColor:     t.active ? t.color : 'var(--sct-border)',
                color:           t.active ? t.color : 'var(--sct-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <BTCGLILagChart
          data={displayedRows}
          turningPoints={result.turningPoints}
          phaseZones={displayedZones}
          showRaw={showRaw}
          showTurningPoints={showTurningPoints}
          showPhases={showPhases}
          isSelecting={isSelecting}
          selectionArea={selectionArea}
          chartHandlers={chartHandlers}
          cancel={cancel}
        />
      </div>

      {/* Momentum panel */}
      {showMomentum && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--sct-text)' }}>GLI Momentum</p>
          <p className="text-xs mb-3" style={{ color: 'var(--sct-muted)' }}>20-day rate of change of the shifted GLI · confirms turning points</p>
          <GLIMomentumChart data={displayedRows} />
        </div>
      )}

      {/* Bottom row: lag optimizer + macro read */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GLILagOptimizerPanel lagTests={result.lagTests} selectedLag={lagDays} onSelectLag={setLagDays} />
        <GLIMacroReadPanel current={result.current} macroRead={result.macroRead} />
      </div>

      {showShareModal && (
        <BTCGLIShareModal payload={sharePayload} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
