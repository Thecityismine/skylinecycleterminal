"use client";

import { useState } from 'react';
import { CapitalAgeHodlWaveChart } from '@/components/charts/CapitalAgeHodlWaveChart';
import { VintageSupplyChart } from '@/components/charts/VintageSupplyChart';
import { AgePyramidChart } from '@/components/charts/AgePyramidChart';
import { DormancyClockGauge } from '@/components/charts/DormancyClockGauge';
import { DormancyTrendChart } from '@/components/charts/DormancyTrendChart';
import {
  AGE_BANDS,
  vintageColorForYear,
  fmtYears,
  type HodlWaveChartPoint,
  type VintageChartPoint,
  type AgePyramidRow,
  type DormancyClockData,
  type CapitalAgingScore,
} from '@/lib/indicators/capitalAgeStructure';

type TabKey = 'overview' | 'hodl-waves' | 'supply-vintage' | 'age-pyramid' | 'dormancy-clock';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',        label: 'Overview' },
  { key: 'hodl-waves',      label: 'Realized Cap HODL Waves' },
  { key: 'supply-vintage',  label: 'Supply Vintage' },
  { key: 'age-pyramid',     label: 'Age Pyramid' },
  { key: 'dormancy-clock',  label: 'Dormancy Clock' },
];

type Props = {
  hodlWaveData: HodlWaveChartPoint[];
  vintageData: VintageChartPoint[];
  vintageYears: string[];
  agePyramidRows: AgePyramidRow[];
  dormancy: DormancyClockData;
  capitalAgingScore: CapitalAgingScore;
};

function CardShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <div className="mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--sct-secondary)' }}>{title}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function HodlWaveLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
      {AGE_BANDS.map((b) => (
        <span key={b.key} className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: b.color, display: 'inline-block' }} />
          {b.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-[10px] font-mono ml-2" style={{ color: 'var(--sct-muted)' }}>
        <span className="w-3 h-0.5 rounded" style={{ backgroundColor: 'rgba(245,247,250,0.65)', display: 'inline-block' }} />
        BTC Price (log)
      </span>
    </div>
  );
}

export function CapitalAgeTabs({ hodlWaveData, vintageData, vintageYears, agePyramidRows, dormancy, capitalAgingScore }: Props) {
  const [active, setActive] = useState<TabKey>('overview');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all duration-150"
              style={{
                backgroundColor: isActive ? 'var(--sct-border)' : 'transparent',
                borderColor:     isActive ? '#F7931A' : 'var(--sct-border)',
                color:           isActive ? 'var(--sct-text)' : 'var(--sct-secondary)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {active === 'overview' && (
        <div className="space-y-4">
          <CardShell title="Realized Cap HODL Waves" sub="Stacked % of realized cap by coin-age cohort · BTC price overlay (log)">
            <HodlWaveLegend />
            <CapitalAgeHodlWaveChart data={hodlWaveData} height={360} />
          </CardShell>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardShell title="Age Pyramid" sub="Latest snapshot — supply share vs. realized-cap share by cohort">
              <AgePyramidChart rows={agePyramidRows} />
            </CardShell>
            <CardShell title="Dormancy Clock" sub="Average time since a BTC last moved">
              <div className="flex items-center justify-center">
                <DormancyClockGauge years={dormancy.years} />
              </div>
              <p className="text-xs text-center mt-1" style={{ color: dormancy.regime === 'Rising' ? '#35D07F' : dormancy.regime === 'Falling' ? '#FF5C5C' : 'var(--sct-muted)' }}>
                {dormancy.regime} · 90D {dormancy.trend90d >= 0 ? '+' : ''}{dormancy.trend90d.toFixed(2)}y
              </p>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--sct-muted)' }}>{dormancy.description}</p>
            </CardShell>
          </div>
        </div>
      )}

      {active === 'hodl-waves' && (
        <CardShell title="Realized Cap HODL Waves — Full History" sub="Stacked % of realized cap by coin-age cohort · BTC price overlay (log) · drag to zoom">
          <HodlWaveLegend />
          <CapitalAgeHodlWaveChart data={hodlWaveData} height={520} />
        </CardShell>
      )}

      {active === 'supply-vintage' && (
        <CardShell title="Supply by Vintage Year" sub="% of circulating supply grouped by the calendar year each coin last moved · drag to zoom">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3 max-h-16 overflow-y-auto">
            {vintageYears.map((y) => (
              <span key={y} className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: vintageColorForYear(y, vintageYears), display: 'inline-block' }} />
                {y}
              </span>
            ))}
          </div>
          <VintageSupplyChart data={vintageData} years={vintageYears} height={520} />
        </CardShell>
      )}

      {active === 'age-pyramid' && (
        <CardShell title="Age Pyramid" sub="Latest snapshot — supply share vs. realized-cap share by coin-age cohort">
          <AgePyramidChart rows={agePyramidRows} />
        </CardShell>
      )}

      {active === 'dormancy-clock' && (
        <div className="space-y-4">
          <CardShell title="BTC Dormancy Clock" sub="Average time since a Bitcoin last moved">
            <div className="flex items-center justify-center py-2">
              <DormancyClockGauge years={dormancy.years} size={260} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>90D Trend</p>
                <p className="text-sm font-mono font-bold" style={{ color: dormancy.trend90d >= 0 ? '#35D07F' : '#FF5C5C' }}>{fmtYears(dormancy.trend90d)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Regime</p>
                <p className="text-sm font-mono font-bold" style={{ color: dormancy.regime === 'Rising' ? '#35D07F' : dormancy.regime === 'Falling' ? '#FF5C5C' : 'var(--sct-amber)' }}>{dormancy.regime}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Capital Aging Score</p>
                <p className="text-sm font-mono font-bold" style={{ color: capitalAgingScore.color }}>{capitalAgingScore.score}/100</p>
              </div>
            </div>
          </CardShell>
          <CardShell title="Dormancy Trend" sub="Average coin age over time · BTC price overlay (log) · drag to zoom">
            <DormancyTrendChart data={hodlWaveData} height={340} />
          </CardShell>
        </div>
      )}
    </div>
  );
}
