"use client";

import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { MacroLineChart } from '@/components/charts/MacroLineChart';
import type { MacroResponse } from '@/lib/api/fred';

function fmt(n: number, dec = 2): string {
  return n.toFixed(dec);
}

function signColor(bearish: boolean): string {
  return bearish ? 'var(--sct-red)' : 'var(--sct-green)';
}

function scoreColor(score: number): string {
  if (score < 30) return '#3B82F6';
  if (score < 55) return '#35D07F';
  if (score < 75) return '#E6B450';
  return '#FF5C5C';
}

function liquiditySignal(m2YoY: number): { label: string; color: string } {
  if (m2YoY > 5)  return { label: 'Expanding',   color: '#35D07F' };
  if (m2YoY > 0)  return { label: 'Slowing',     color: '#E6B450' };
  return              { label: 'Contracting', color: '#FF5C5C' };
}

function rateTrendSignal(rate: number): { label: string; color: string } {
  if (rate < 2) return { label: 'Accommodative', color: '#35D07F' };
  if (rate < 4) return { label: 'Neutral',        color: '#E6B450' };
  return             { label: 'Restrictive',    color: '#FF5C5C' };
}

function dollarSignal(change1M: number): { label: string; color: string } {
  if (change1M < -1) return { label: 'Weakening',     color: '#35D07F' };
  if (change1M <  1) return { label: 'Stable',        color: '#E6B450' };
  return                    { label: 'Strengthening', color: '#FF5C5C' };
}

function realRateSignal(rr: number): { label: string; color: string } {
  if (rr < 0) return { label: 'Negative (bullish)', color: '#35D07F' };
  if (rr < 1) return { label: 'Slightly positive',  color: '#E6B450' };
  return             { label: 'Positive (bearish)',  color: '#FF5C5C' };
}

function macroSignal(score: number): string {
  if (score < 30) return 'Accommodative — tailwind for risk assets';
  if (score < 55) return 'Neutral — balanced conditions';
  if (score < 75) return 'Restrictive — headwind for risk assets';
  return                 'Bearish macro — strong headwind';
}

export default function MacroPage() {
  const { data: macro, loading, error } = useApiData<MacroResponse>('/api/macro');

  const liquidity = macro ? liquiditySignal(macro.m2YoY)        : null;
  const rateTrend = macro ? rateTrendSignal(macro.fedRate.current) : null;
  const dollar    = macro ? dollarSignal(macro.dxy.change1M)     : null;
  const realRate  = macro ? realRateSignal(macro.realRate)       : null;

  // Compute real rate series for the chart (10Y minus CPI YoY at each point)
  // We approximate by overlaying tenYear series with current cpiYoY offset
  const realRateSeries = macro
    ? macro.tenYear.series.map((d) => ({
        date: d.date,
        value: d.value - (macro.cpiYoY),
      }))
    : [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Macro Liquidity"
        subtitle="Global liquidity conditions and their impact on crypto"
      />

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          label="DXY"
          value={macro ? fmt(macro.dxy.current, 1) : '—'}
          sub={
            macro
              ? `${macro.dxy.change1M >= 0 ? '▲' : '▼'} ${Math.abs(macro.dxy.change1M).toFixed(2)}% 30d`
              : 'Loading…'
          }
          trend={macro ? (macro.dxy.change1M <= 0 ? 'up' : 'down') : undefined}
          accent={macro ? signColor(macro.dxy.change1M > 0) : 'var(--sct-muted)'}
          freshness="daily"
          source="FRED"
        />
        <StatCard
          label="Fed Funds Rate"
          value={macro ? `${fmt(macro.fedRate.current)}%` : '—'}
          sub={macro ? rateTrend?.label ?? '' : 'Loading…'}
          accent={macro ? rateTrend?.color ?? 'var(--sct-muted)' : 'var(--sct-muted)'}
          freshness="weekly"
          source="FRED"
        />
        <StatCard
          label="CPI YoY"
          value={macro ? `${fmt(macro.cpiYoY)}%` : '—'}
          sub={macro ? (macro.cpiYoY > 3 ? 'Above target' : 'Near target') : 'Loading…'}
          accent={macro ? signColor(macro.cpiYoY > 3) : 'var(--sct-muted)'}
          freshness="weekly"
          source="FRED"
        />
        <StatCard
          label="M2 Growth"
          value={macro ? `${fmt(macro.m2YoY)}%` : '—'}
          sub={macro ? liquidity?.label ?? '' : 'Loading…'}
          trend={macro ? (macro.m2YoY > 0 ? 'up' : 'down') : undefined}
          accent={macro ? liquidity?.color ?? 'var(--sct-muted)' : 'var(--sct-muted)'}
          freshness="weekly"
          source="FRED"
        />
      </div>

      {/* Macro regime panel */}
      <div className="grid grid-cols-3 gap-6">
        <InsightPanel title="Macro Regime">
          <InsightRow label="Liquidity"    value={macro ? liquidity!.label    : '—'} valueColor={liquidity?.color} />
          <InsightRow label="Rate Trend"   value={macro ? rateTrend!.label    : '—'} valueColor={rateTrend?.color} />
          <InsightRow label="Dollar"       value={macro ? dollar!.label       : '—'} valueColor={dollar?.color} />
          <InsightRow label="Real Rate"    value={macro ? `${fmt(macro.realRate)}%` : '—'} valueColor={realRate?.color} />
          <InsightRow label="10Y Yield"    value={macro ? `${fmt(macro.tenYear.current)}%` : '—'} />
          <InsightRow label="2Y Yield"     value={macro ? `${fmt(macro.twoYear)}%` : '—'} />
          <InsightRow
            label="Yield Curve"
            value={macro ? `${fmt(macro.tenYear.current - macro.twoYear)}% spread` : '—'}
            valueColor={macro ? signColor(macro.tenYear.current - macro.twoYear < 0) : undefined}
          />
        </InsightPanel>

        {/* Macro score gauge */}
        <div
          className="col-span-2 rounded-xl border p-8 flex flex-col items-center justify-center gap-4"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor: macro ? scoreColor(macro.macroScore) + '40' : 'var(--sct-border)',
            transition: 'border-color 0.6s ease',
          }}
        >
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Macro Score for BTC
          </p>
          <div
            className="text-7xl font-mono font-bold transition-colors duration-700"
            style={{ color: macro ? scoreColor(macro.macroScore) : 'var(--sct-muted)' }}
          >
            {loading ? '…' : error ? '!' : macro?.macroScore ?? '—'}
          </div>
          {macro && (
            <p className="text-sm text-center max-w-sm" style={{ color: 'var(--sct-muted)' }}>
              {macroSignal(macro.macroScore)}
            </p>
          )}
          <div className="w-full max-w-sm">
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: macro ? `${macro.macroScore}%` : '0%',
                  backgroundColor: macro ? scoreColor(macro.macroScore) : '#3B82F6',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
              <span style={{ color: '#3B82F6' }}>Accommodative</span>
              <span style={{ color: '#35D07F' }}>Neutral</span>
              <span style={{ color: '#E6B450' }}>Restrictive</span>
              <span style={{ color: '#FF5C5C' }}>Bearish</span>
            </div>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
            DXY trend · Fed rate · Real rates · M2 growth — all sourced from FRED
          </p>
        </div>
      </div>

      {/* 2×3 chart grid */}
      <div className="grid grid-cols-2 gap-6">

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
              DXY — Dollar Index (DTWEXBGS)
            </p>
            <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>FRED · Daily</p>
          </div>
          <MacroLineChart id="dxy" data={macro?.dxy.series ?? []} color="#F7931A" unit="" decimals={1} />
          <p className="mt-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
            Rising DXY = stronger dollar = risk-off headwind for crypto.
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
              Federal Funds Rate (FEDFUNDS)
            </p>
            <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>FRED · Monthly</p>
          </div>
          <MacroLineChart id="fed" data={macro?.fedRate.series ?? []} color="#FF5C5C" unit="%" decimals={2} />
          <p className="mt-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
            Higher rates = tighter liquidity conditions. Rate cuts historically precede BTC rallies.
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
              CPI — All Items (CPIAUCSL)
            </p>
            <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>FRED · Monthly</p>
          </div>
          <MacroLineChart id="cpi" data={macro?.cpiSeries ?? []} color="#E6B450" unit="" decimals={1} />
          <p className="mt-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
            Fed reacts to inflation; high CPI → rate hikes → liquidity tightening.
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
              M2 Money Supply (M2SL)
            </p>
            <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>FRED · Monthly — Billions USD</p>
          </div>
          <MacroLineChart id="m2" data={macro?.m2Series ?? []} color="#35D07F" unit="" decimals={0} />
          <p className="mt-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
            Expanding M2 historically benefits BTC. M2 growth of {macro ? `${fmt(macro.m2YoY)}%` : '—'} YoY.
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
              10-Year Treasury Yield (DGS10)
            </p>
            <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>FRED · Daily</p>
          </div>
          <MacroLineChart id="t10y" data={macro?.tenYear.series ?? []} color="#A78BFA" unit="%" decimals={2} />
          <p className="mt-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
            Rising yields compete with risk assets for capital. Currently {macro ? `${fmt(macro.tenYear.current)}%` : '—'}.
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
              Real Rate (10Y − CPI YoY)
            </p>
            <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>Calculated · Daily</p>
          </div>
          <MacroLineChart
            id="realrate"
            data={realRateSeries}
            color={macro && macro.realRate < 0 ? '#35D07F' : '#FF5C5C'}
            unit="%"
            decimals={2}
          />
          <p className="mt-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
            Negative real rates ({macro ? `${fmt(macro.realRate)}%` : '—'} now) are historically a tailwind for BTC.
          </p>
        </div>

      </div>
    </div>
  );
}
