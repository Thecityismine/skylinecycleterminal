"use client";

import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { MacroLineChart, type RefLine } from '@/components/charts/MacroLineChart';
import type { MacroResponse } from '@/lib/api/fred';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 2) { return n.toFixed(dec); }

function scoreColor(s: number): string {
  if (s < 30) return '#3B82F6';
  if (s < 55) return '#35D07F';
  if (s < 75) return '#E6B450';
  return '#FF5C5C';
}

function macroRegimeLabel(score: number): string {
  if (score < 30) return 'Accommodative — tailwind for risk assets';
  if (score < 55) return 'Neutral — balanced macro conditions';
  if (score < 75) return 'Restrictive — headwind for crypto';
  return                 'Bearish — strong macro headwind';
}

function yieldCurveLabel(spread: number): { label: string; color: string } {
  if (spread < -0.5) return { label: 'Deeply inverted — recession watch',  color: '#FF5C5C' };
  if (spread < 0)    return { label: 'Inverted — risk-off signal',         color: '#F97316' };
  if (spread < 0.5)  return { label: 'Flat — uncertainty',                color: '#E6B450' };
  if (spread < 1.5)  return { label: 'Normal — growth expectations',      color: '#35D07F' };
  return                    { label: 'Steep — early cycle expansion',      color: '#3B82F6' };
}

function realRateLabel(rr: number): { label: string; color: string } {
  if (rr < -2) return { label: 'Deeply negative — strong BTC tailwind',   color: '#3B82F6' };
  if (rr < 0)  return { label: 'Negative — BTC tailwind',                 color: '#35D07F' };
  if (rr < 1)  return { label: 'Slightly positive — neutral',             color: '#E6B450' };
  return              { label: 'Positive — BTC headwind',                  color: '#FF5C5C' };
}

function m2Label(yoy: number): { label: string; color: string } {
  if (yoy > 8)  return { label: 'Rapid expansion — bullish liquidity',  color: '#3B82F6' };
  if (yoy > 3)  return { label: 'Expanding — supportive',               color: '#35D07F' };
  if (yoy > 0)  return { label: 'Slow growth — neutral',                color: '#E6B450' };
  return               { label: 'Contracting — bearish liquidity',      color: '#FF5C5C' };
}

// ─── Chart config ─────────────────────────────────────────────────────────────

type ChartDef = {
  id:      string;
  title:   string;
  source:  string;
  series:  () => { date: string; value: number }[];
  color:   string;
  unit:    string;
  dec:     number;
  refs?:   RefLine[];
  insight: string;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MacroPage() {
  const { data: macro, loading } = useApiData<MacroResponse>('/api/macro');

  const yieldCurveSpread = macro
    ? macro.tenYear.current - macro.twoYear
    : null;
  const ycSignal  = yieldCurveLabel(yieldCurveSpread ?? 0);
  const rrSignal  = realRateLabel(macro?.realRate ?? 0);
  const m2Signal  = m2Label(macro?.m2YoY ?? 0);

  const CHARTS: ChartDef[] = [
    {
      id:     'dxy',
      title:  'DXY — Dollar Index',
      source: 'FRED DTWEXBGS · Daily',
      series: () => macro?.dxy.series ?? [],
      color:  '#F7931A',
      unit:   '',
      dec:    1,
      insight: 'Rising dollar = risk-off headwind. BTC/crypto historically inverse-correlated with DXY strength.',
    },
    {
      id:     'fed',
      title:  'Fed Funds Rate',
      source: 'FRED FEDFUNDS · Monthly',
      series: () => macro?.fedRate.series ?? [],
      color:  '#FF5C5C',
      unit:   '%',
      dec:    2,
      refs:   [{ value: 2, color: '#35D07F', label: '2% neutral', dashed: true }],
      insight: 'Rate cuts historically precede BTC rallies 6–12 months later. Current: ' + (macro ? fmt(macro.fedRate.current) + '%' : '—'),
    },
    {
      id:     'cpi',
      title:  'CPI Inflation YoY',
      source: 'FRED CPIAUCSL · Monthly',
      series: () => macro?.cpiYoYSeries ?? [],
      color:  '#E6B450',
      unit:   '%',
      dec:    2,
      refs:   [{ value: 2, color: '#35D07F', label: 'Fed target', dashed: true }],
      insight: 'Above 2% = Fed pressure to tighten. Falling CPI clears path for rate cuts and looser liquidity.',
    },
    {
      id:     'm2',
      title:  'M2 Money Supply',
      source: 'FRED M2SL · Monthly · $B',
      series: () => macro?.m2Series ?? [],
      color:  '#35D07F',
      unit:   '',
      dec:    0,
      insight: `M2 growth ${macro ? fmt(macro.m2YoY) : '—'}% YoY. ${m2Signal.label}. Global M2 expansion is one of the strongest predictors of BTC price.`,
    },
    {
      id:     'yieldcurve',
      title:  'Yield Curve (10Y − 2Y)',
      source: 'FRED DGS10 − DGS2 · Daily',
      series: () => macro?.yieldCurveSeries ?? [],
      color:  yieldCurveSpread != null ? ycSignal.color : '#A78BFA',
      unit:   '%',
      dec:    2,
      refs:   [{ value: 0, color: '#FF5C5C', label: 'Inversion', dashed: true }],
      insight: 'Negative spread = yield curve inversion = leading recession indicator. Risk-off when inverted; recovery when turning positive.',
    },
    {
      id:     'realrate',
      title:  'Real Rate (10Y − CPI YoY)',
      source: 'FRED DGS10 − CPIAUCSL · Daily',
      series: () => macro?.realRateSeries ?? [],
      color:  macro?.realRate != null
        ? (macro.realRate < 0 ? '#35D07F' : '#FF5C5C')
        : '#A78BFA',
      unit:   '%',
      dec:    2,
      refs:   [{ value: 0, color: '#94A3B8', label: '0% breakeven', dashed: true }],
      insight: 'Negative real rates = holding cash loses purchasing power = tailwind for hard assets like BTC. Current: ' + (macro ? fmt(macro.realRate) + '%' : '—'),
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Macro Liquidity"
        subtitle="Global liquidity conditions and their impact on Bitcoin & crypto"
        regime={
          macro == null     ? 'neutral'
          : macro.macroScore < 30 ? 'accumulate'
          : macro.macroScore < 55 ? 'hold'
          : macro.macroScore < 75 ? 'caution'
          : 'distribution'
        }
      />

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          label="DXY Index"
          value={macro ? fmt(macro.dxy.current, 1) : '—'}
          sub={macro
            ? `${macro.dxy.change1M >= 0 ? '▲' : '▼'} ${Math.abs(macro.dxy.change1M).toFixed(2)}% 30-day`
            : 'Loading…'}
          trend={macro ? (macro.dxy.change1M <= 0 ? 'up' : 'down') : undefined}
          accent={macro ? (macro.dxy.change1M > 0 ? 'var(--sct-red)' : 'var(--sct-green)') : 'var(--sct-muted)'}
          freshness="daily"
          source="FRED"
        />
        <StatCard
          label="Fed Funds Rate"
          value={macro ? `${fmt(macro.fedRate.current)}%` : '—'}
          sub={macro
            ? macro.fedRate.current < 2 ? 'Accommodative'
            : macro.fedRate.current < 4 ? 'Neutral'
            : 'Restrictive'
            : 'Loading…'}
          accent={macro
            ? macro.fedRate.current < 2 ? '#35D07F'
            : macro.fedRate.current < 4 ? '#E6B450'
            : '#FF5C5C'
            : 'var(--sct-muted)'}
          freshness="weekly"
          source="FRED"
        />
        <StatCard
          label="Real Rate"
          value={macro ? `${fmt(macro.realRate)}%` : '—'}
          sub={macro ? rrSignal.label : 'Loading…'}
          accent={macro ? rrSignal.color : 'var(--sct-muted)'}
          freshness="daily"
          source="Calculated"
        />
        <StatCard
          label="Yield Curve"
          value={yieldCurveSpread != null ? `${yieldCurveSpread >= 0 ? '+' : ''}${fmt(yieldCurveSpread)}%` : '—'}
          sub={macro ? ycSignal.label : 'Loading…'}
          accent={macro ? ycSignal.color : 'var(--sct-muted)'}
          freshness="daily"
          source="FRED"
        />
      </div>

      {/* ── Second stat row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          label="CPI YoY"
          value={macro ? `${fmt(macro.cpiYoY)}%` : '—'}
          sub={macro ? (macro.cpiYoY > 3 ? 'Above 2% Fed target' : 'Near target') : 'Loading…'}
          accent={macro ? (macro.cpiYoY > 3 ? '#FF5C5C' : '#35D07F') : 'var(--sct-muted)'}
          freshness="weekly"
          source="FRED"
        />
        <StatCard
          label="M2 Growth YoY"
          value={macro ? `${fmt(macro.m2YoY)}%` : '—'}
          sub={macro ? m2Signal.label : 'Loading…'}
          trend={macro ? (macro.m2YoY > 0 ? 'up' : 'down') : undefined}
          accent={macro ? m2Signal.color : 'var(--sct-muted)'}
          freshness="weekly"
          source="FRED"
        />
        <StatCard
          label="10Y Yield"
          value={macro ? `${fmt(macro.tenYear.current)}%` : '—'}
          sub={macro
            ? macro.tenYear.current > 4.5 ? 'High — competes with risk assets'
            : macro.tenYear.current > 3   ? 'Elevated'
            : 'Low — supportive for BTC'
            : 'Loading…'}
          accent={macro ? (macro.tenYear.current > 4 ? '#F97316' : '#35D07F') : 'var(--sct-muted)'}
          freshness="daily"
          source="FRED"
        />
        <StatCard
          label="2Y Yield"
          value={macro ? `${fmt(macro.twoYear)}%` : '—'}
          sub={macro ? `${macro.twoYear > macro.tenYear.current ? '⚠ Above 10Y — inverted' : 'Below 10Y — normal'}` : 'Loading…'}
          accent={macro ? (macro.twoYear > macro.tenYear.current ? '#FF5C5C' : '#35D07F') : 'var(--sct-muted)'}
          freshness="daily"
          source="FRED"
        />
      </div>

      {/* ── Macro score gauge + regime panel ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
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
            className="text-7xl font-bold transition-colors duration-700"
            style={{ color: macro ? scoreColor(macro.macroScore) : 'var(--sct-muted)' }}
          >
            {loading ? '…' : macro?.macroScore ?? '—'}
          </div>
          {macro && (
            <p className="text-sm text-center" style={{ color: 'var(--sct-muted)' }}>
              {macroRegimeLabel(macro.macroScore)}
            </p>
          )}
          <div className="w-full max-w-md">
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: macro ? `${macro.macroScore}%` : '0%',
                  backgroundColor: macro ? scoreColor(macro.macroScore) : '#3B82F6',
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--sct-muted)' }}>
              <span style={{ color: '#3B82F6' }}>0 Accommodative</span>
              <span style={{ color: '#35D07F' }}>30 Neutral</span>
              <span style={{ color: '#E6B450' }}>55 Restrictive</span>
              <span style={{ color: '#FF5C5C' }}>75 Bearish</span>
            </div>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
            DXY 30d trend · Fed rate · Real rate · M2 YoY — equally weighted
          </p>
        </div>

        <InsightPanel title="Macro Regime">
          <InsightRow
            label="DXY Trend"
            value={macro ? `${macro.dxy.change1M >= 0 ? '+' : ''}${fmt(macro.dxy.change1M)}% 30d` : '—'}
            valueColor={macro ? (macro.dxy.change1M > 0 ? 'var(--sct-red)' : 'var(--sct-green)') : undefined}
          />
          <InsightRow label="Fed Rate"      value={macro ? `${fmt(macro.fedRate.current)}%` : '—'} />
          <InsightRow label="CPI YoY"       value={macro ? `${fmt(macro.cpiYoY)}%` : '—'}
            valueColor={macro ? (macro.cpiYoY > 3 ? '#FF5C5C' : '#35D07F') : undefined} />
          <InsightRow label="M2 Growth"     value={macro ? `${fmt(macro.m2YoY)}% YoY` : '—'}
            valueColor={macro ? m2Signal.color : undefined} />
          <InsightRow label="Real Rate"     value={macro ? `${fmt(macro.realRate)}%` : '—'}
            valueColor={macro ? rrSignal.color : undefined} />
          <InsightRow label="Yield Curve"   value={yieldCurveSpread != null ? `${fmt(yieldCurveSpread)}%` : '—'}
            valueColor={macro ? ycSignal.color : undefined} />
          <InsightRow label="Yield Curve Signal" value={macro ? ycSignal.label : '—'}
            valueColor={macro ? ycSignal.color : undefined} />
          {macro && (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              Data from FRED (St. Louis Fed). Updated daily. Cached 24h.
            </p>
          )}
        </InsightPanel>
      </div>

      {/* ── Chart grid — 3 × 2 ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        {CHARTS.map(c => (
          <div
            key={c.id}
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
                {c.title}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>{c.source}</p>
            </div>
            <MacroLineChart
              id={c.id}
              data={c.series()}
              color={c.color}
              unit={c.unit}
              decimals={c.dec}
              height={220}
              referenceLines={c.refs}
            />
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              {c.insight}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
