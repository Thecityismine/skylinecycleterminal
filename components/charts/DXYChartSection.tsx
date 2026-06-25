"use client";

import { useState, useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { DXYChart } from '@/components/charts/DXYChart';
import { DXYShareModal } from '@/components/share/DXYShareModal';
import type { DxyWeeklyPoint, DxyZone, DxyCurrent } from '@/lib/indicators/dxyTrend';

type Props = {
  chartData: DxyWeeklyPoint[];
  zones:     DxyZone[];
  current:   DxyCurrent;
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

const SHARE_RANGE_DAYS = 1825; // always use 5Y for the share card

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      <span className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>{label}</span>
    </div>
  );
}

export function DXYChartSection({ chartData, zones, current }: Props) {
  const [range,      setRange]      = useState<Range>('5Y');
  const [show50W,    setShow50W]    = useState(true);
  const [show200W,   setShow200W]   = useState(true);
  const [showBTC,    setShowBTC]    = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [showShare,  setShowShare]  = useState(false);

  const displayedData = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === Infinity) return chartData;
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    return chartData.filter(d => d.date >= cutoff);
  }, [chartData, range]);

  const filteredZones = useMemo(() => {
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

  // Share card always uses a fixed 5Y window
  const shareData = useMemo(() => {
    const cutoff = new Date(Date.now() - SHARE_RANGE_DAYS * 86_400_000).toISOString().slice(0, 10);
    return chartData.filter(d => d.date >= cutoff);
  }, [chartData]);

  const shareZones = useMemo(() => {
    if (!shareData.length) return zones;
    const first = shareData[0].date;
    const last  = shareData[shareData.length - 1].date;
    return zones
      .filter(z => z.end >= first && z.start <= last)
      .map(z => ({
        ...z,
        start: z.start < first ? first : z.start,
        end:   z.end   > last  ? last  : z.end,
      }));
  }, [zones, shareData]);

  return (
    <>
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
              backgroundColor: show200W ? 'rgba(140,107,255,0.12)' : 'transparent',
              borderColor:     show200W ? '#8C6BFF' : 'var(--sct-border)',
              color:           show200W ? '#8C6BFF' : 'var(--sct-muted)',
            }}
          >
            200W MA
          </button>

          {/* Toggle: BTC */}
          <button
            onClick={() => setShowBTC(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: showBTC ? 'rgba(245,247,250,0.08)' : 'transparent',
              borderColor:     showBTC ? 'rgba(245,247,250,0.3)' : 'var(--sct-border)',
              color:           showBTC ? 'rgba(245,247,250,0.7)' : 'var(--sct-muted)',
            }}
          >
            BTC
          </button>

          {/* Toggle: Events */}
          <button
            onClick={() => setShowEvents(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: showEvents ? 'rgba(234,184,77,0.08)' : 'transparent',
              borderColor:     showEvents ? 'rgba(230,180,80,0.4)' : 'var(--sct-border)',
              color:           showEvents ? '#EAB84D' : 'var(--sct-muted)',
            }}
          >
            Events
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Legend */}
          <div className="flex items-center gap-3">
            <LegendDot color="#7AA2FF" label="DXY" />
            {show50W  && <LegendDot color="#EAB84D" label="50W MA" />}
            {show200W && <LegendDot color="#8C6BFF" label="200W MA" />}
            {showBTC  && <LegendDot color="rgba(245,247,250,0.5)" label="BTC" />}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, backgroundColor: 'var(--sct-border)' }} />

          {/* Share button */}
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: 'transparent',
              borderColor:     'var(--sct-border)',
              color:           'var(--sct-muted)',
            }}
          >
            <Share2 size={11} />
            Share
          </button>
        </div>

        {/* Chart */}
        <div style={{ height: 480 }}>
          <DXYChart
            data={displayedData}
            zones={filteredZones}
            show50W={show50W}
            show200W={show200W}
            showBTC={showBTC}
            showEvents={showEvents}
          />
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <DXYShareModal
          payload={{
            chartData:   shareData,
            zones:       shareZones,
            current,
            generatedAt: new Date().toISOString(),
          }}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
