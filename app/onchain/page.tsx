"use client";

import { useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { MacroLineChart, type MacroDataPoint } from '@/components/charts/MacroLineChart';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

type OnChainPoint = {
  time:      string;
  mvrvProxy: number | null;
  puell:     number | null;
  nvt:       number | null;
  addresses: number | null;
};

type OnChainResponse = {
  points:  OnChainPoint[];
  current: {
    mvrvProxy:  number | null;
    puell:      number | null;
    nvt:        number | null;
    addresses:  number | null;
    price:      number | null;
  };
};

function mvrvSignal(v: number | null): { label: string; color: string } {
  if (v == null)  return { label: '—',                        color: 'var(--sct-muted)' };
  if (v < 0.8)    return { label: 'Extreme Undervalue',       color: '#3B82F6' };
  if (v < 1.0)    return { label: 'Accumulate',               color: '#60A5FA' };
  if (v < 1.5)    return { label: 'Fair Value — Hold',        color: '#35D07F' };
  if (v < 2.5)    return { label: 'Moderate Premium',         color: '#E6B450' };
  if (v < 3.5)    return { label: 'High Premium — Caution',   color: '#F97316' };
  return                  { label: 'Extreme Premium — Top',   color: '#FF5C5C' };
}

function puellSignal(v: number | null): { label: string; color: string } {
  if (v == null)  return { label: '—',                        color: 'var(--sct-muted)' };
  if (v < 0.5)    return { label: 'Miner Stress — Accumulate',color: '#3B82F6' };
  if (v < 1.0)    return { label: 'Below Average',            color: '#35D07F' };
  if (v < 2.0)    return { label: 'Average — Neutral',        color: '#E6B450' };
  if (v < 4.0)    return { label: 'Elevated — Caution',       color: '#F97316' };
  return                  { label: 'Extreme — Top Signal',    color: '#FF5C5C' };
}

function nvtSignal(v: number | null): { label: string; color: string } {
  if (v == null)  return { label: '—',                        color: 'var(--sct-muted)' };
  if (v < 300)    return { label: 'Undervalued Network',      color: '#3B82F6' };
  if (v < 600)    return { label: 'Fair Value',               color: '#35D07F' };
  if (v < 1200)   return { label: 'Moderately High',          color: '#E6B450' };
  return                  { label: 'Overvalued Network',      color: '#FF5C5C' };
}

function addrSignal(v: number | null, data: OnChainPoint[]): { label: string; color: string } {
  if (v == null || data.length < 30) return { label: '—', color: 'var(--sct-muted)' };
  const hist = data.filter(d => d.addresses != null).map(d => d.addresses!);
  const avg  = hist.reduce((a, b) => a + b, 0) / hist.length;
  const ratio = v / avg;
  if (ratio < 0.7)   return { label: 'Well Below Average',   color: '#3B82F6' };
  if (ratio < 0.9)   return { label: 'Below Average',        color: '#60A5FA' };
  if (ratio < 1.1)   return { label: 'At Historical Average',color: '#35D07F' };
  if (ratio < 1.3)   return { label: 'Above Average — Active', color: '#E6B450' };
  return                     { label: 'High Activity',        color: '#FF5C5C' };
}

// ─── Signal widgets ───────────────────────────────────────────────────────────

type MetricWidget = {
  zone:        string;
  color:       string;
  headline:    string;
  body:        string;
  contextNote: string;
  barPos:      number;
  barZones:    { pct: number; color: string }[];
  barLabels:   string[];
};

function buildMVRVWidget(v: number | null, sig: { label: string; color: string }): MetricWidget | null {
  if (v == null) return null;
  const barPos = Math.min(v / 4.5, 1) * 100;
  let body = '', ctx = '';
  if (v < 0.8)       { body = 'BTC is below its 200-day MA — historically rare territory. Only a handful of weeks across BTC\'s entire history have touched this level. Deepest discount zone relative to trend.';                                          ctx = 'MVRV below 0.8 has preceded 10–30× returns over the following 2–3 years in prior cycles.'; }
  else if (v < 1.0)  { body = 'Price is below the 200-day MA — undervalued vs recent trend. Many recent buyers are underwater. The market is in a bottoming or early recovery process.';                                                                         ctx = 'MVRV between 0.8–1.0 has historically resolved to the upside within 6–18 months.'; }
  else if (v < 1.5)  { body = 'Fair value range. BTC is above its 200-day MA without excessive premium. This is where a healthy bull cycle spends most of its time — hold core positions.';                                                                        ctx = 'The 2020–2021 bull run started near MVRV 1.0 and peaked above 4.5 at the cycle top.'; }
  else if (v < 2.5)  { body = 'Moderate premium above trend. The bull cycle is maturing and long-term holders are sitting on significant unrealized gains. Begin planning partial exits in tranches.';                                                              ctx = 'Prior cycles saw consolidation at MVRV 2.0–3.0 before the final surge to 3.5–5.0.'; }
  else if (v < 3.5)  { body = 'High premium — the market is significantly extended above trend. Historically where institutional distribution begins. Risk/reward is unfavorable for new entries.';                                                                 ctx = 'The 2021 cycle top ($69K) saw MVRV reach ~3.5–4.0 before a 75%+ drawdown followed.'; }
  else                { body = 'Extreme premium. Only 2–3 brief windows in BTC\'s history have reached this level. Cycle top conditions — mean reversion is statistically near certain.';                                                                            ctx = 'Every MVRV reading above 3.5 has preceded a major multi-month bear market without exception.'; }
  return {
    zone: sig.label, color: sig.color,
    headline: `Current: ${v.toFixed(2)}× vs 200-day MA`,
    body, contextNote: ctx, barPos,
    barZones: [
      { pct: 17.8, color: '#3B82F6' },
      { pct: 4.4,  color: '#60A5FA' },
      { pct: 11.1, color: '#35D07F' },
      { pct: 22.2, color: '#E6B450' },
      { pct: 22.2, color: '#F97316' },
      { pct: 22.3, color: '#FF5C5C' },
    ],
    barLabels: ['0×', '1.0× Fair', '2.5× Caution', '3.5× Top'],
  };
}

function buildPuellWidget(v: number | null, sig: { label: string; color: string }): MetricWidget | null {
  if (v == null) return null;
  const barPos = Math.min(v / 5.0, 1) * 100;
  let body = '', ctx = '';
  if (v < 0.5)       { body = 'Miners are earning far below their 12-month average — extreme industry stress. The strongest long-term accumulation signal in BTC history. Miners approaching capitulation.';                                 ctx = 'Puell below 0.5 has marked capitulation bottoms in 2015, 2018, and 2022 — each preceded a major bull run.'; }
  else if (v < 1.0)  { body = 'Miner revenue is below the annual average — early recovery or bull phase. Miners are not yet selling aggressively into strength. Favorable risk/reward environment.';                                          ctx = 'Puell below 1.0 has historically preceded significant bull runs within 3–9 months.'; }
  else if (v < 2.0)  { body = 'Average miner revenue — the market is in a healthy, sustainable phase. Miners are profitable without maximum incentive to sell. No extreme signals in either direction.';                                      ctx = 'Puell between 1.0–2.0 represents normal bull market conditions — no action signal needed.'; }
  else if (v < 4.0)  { body = 'Elevated miner profitability. Miners earn well above average — creating a strong selling incentive. Price may be running ahead of on-chain fundamentals. Reduce exposure on strength.';                      ctx = 'Extended periods above 2.0 have preceded corrections of 20–40% in prior cycles.'; }
  else                { body = 'Extreme miner profitability — a classic cycle top signal. At these levels miners have maximum incentive to sell, creating persistent overhead pressure on price.';                                              ctx = 'Puell above 4.0 has historically aligned with cycle tops within 4–8 weeks.'; }
  return {
    zone: sig.label, color: sig.color,
    headline: `Current: ${v.toFixed(2)}× annual miner avg`,
    body, contextNote: ctx, barPos,
    barZones: [
      { pct: 10,  color: '#3B82F6' },
      { pct: 10,  color: '#60A5FA' },
      { pct: 20,  color: '#35D07F' },
      { pct: 40,  color: '#E6B450' },
      { pct: 20,  color: '#FF5C5C' },
    ],
    barLabels: ['0×', '1.0× Avg', '2.0× Elevated', '4.0× Top'],
  };
}

function buildNVTWidget(v: number | null, sig: { label: string; color: string }): MetricWidget | null {
  if (v == null) return null;
  const barPos = Math.min(v / 1500, 1) * 100;
  let body = '', ctx = '';
  if (v < 300)       { body = 'Network value is low relative to transaction activity — the blockchain is "undervalued" by its own usage metrics. Strong fundamental case that price should be higher.';                                                     ctx = 'Low NVT combined with rising active addresses is one of the strongest BTC fundamental buy signals.'; }
  else if (v < 600)  { body = 'NVT in fair value territory. Price growth is supported by actual on-chain activity — the market cap is justified by real blockchain usage. Healthy, sustainable signal.';                                                    ctx = 'Sustainable bull markets tend to stay below NVT 600. Most cycle gains occur within this range.'; }
  else if (v < 1200) { body = 'Price is outpacing on-chain transaction activity. Market cap is running ahead of fundamental network usage — not yet extreme, but watch for accelerating divergence.';                                                       ctx = 'NVT above 600 during rapid price rises often signals speculative froth is building.'; }
  else                { body = 'High NVT — significant disconnection between price and blockchain usage. The market cap is large relative to actual network utility. Strong overvaluation warning.';                                                           ctx = 'NVT peaks above 1.2K have historically preceded major corrections within 1–3 months.'; }
  return {
    zone: sig.label, color: sig.color,
    headline: `Current: ${v.toFixed(0)}K per transaction`,
    body, contextNote: ctx, barPos,
    barZones: [
      { pct: 20,  color: '#3B82F6' },
      { pct: 20,  color: '#35D07F' },
      { pct: 40,  color: '#E6B450' },
      { pct: 20,  color: '#FF5C5C' },
    ],
    barLabels: ['0', '600 Fair', '1.2K Warning', '1.5K+'],
  };
}

function buildAddrWidget(v: number | null, sig: { label: string; color: string }, data: OnChainPoint[]): MetricWidget | null {
  if (v == null || data.length < 30) return null;
  const hist   = data.filter(d => d.addresses != null).map(d => d.addresses!);
  const avg    = hist.reduce((a, b) => a + b, 0) / hist.length;
  const ratio  = v / avg;
  const barPos = Math.min(ratio / 1.6, 1) * 100;
  const pctVsAvg = ((ratio - 1) * 100).toFixed(0);
  let body = '', ctx = '';
  if (ratio < 0.7)      { body = 'Active addresses are well below their historical average — network usage is in a slump. This level of inactivity has historically coincided with bear market bottoms and deep accumulation phases.';  ctx = 'Address activity troughs have historically preceded major bull runs by 3–6 months.'; }
  else if (ratio < 0.9) { body = 'Network activity is below average but recovering. Users are re-engaging with the blockchain — a positive leading indicator, especially when combined with low MVRV.';                                    ctx = 'Rising addresses with flat or falling price often signals that accumulation is underway.'; }
  else if (ratio < 1.1) { body = 'Active addresses near the long-run average — healthy baseline adoption. No extreme signals. Watch the direction of trend: rising is bullish, falling into a price rise is a divergence warning.';    ctx = 'Stable address counts during a price rise indicate organic, sustainable demand.'; }
  else if (ratio < 1.3) { body = 'Above-average network activity — growing engagement and adoption. This level of usage has historically supported continued price appreciation and signals genuine demand.';                               ctx = 'Address growth outpacing price (addresses up, price flat) is a classic bullish lead indicator.'; }
  else                   { body = 'High network activity relative to history. Elevated usage often seen near cycle peaks when retail FOMO drives mass participation. Watch for addresses peaking before price.';                          ctx = 'Peak address activity has historically aligned with late-stage bull market / topping conditions.'; }
  return {
    zone: sig.label, color: sig.color,
    headline: `${v.toFixed(0)}K addresses · ${Number(pctVsAvg) >= 0 ? '+' : ''}${pctVsAvg}% vs historical avg`,
    body, contextNote: ctx, barPos,
    barZones: [
      { pct: 43.75, color: '#3B82F6' },
      { pct: 12.5,  color: '#60A5FA' },
      { pct: 12.5,  color: '#35D07F' },
      { pct: 12.5,  color: '#E6B450' },
      { pct: 18.75, color: '#FF5C5C' },
    ],
    barLabels: ['Very Low', 'Below', 'Average', 'Above', 'High'],
  };
}

function SignalBlock({ widget }: { widget: MetricWidget }) {
  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--sct-border)' }}>
      {/* Zone badge + live value */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded"
          style={{ backgroundColor: widget.color + '25', color: widget.color }}
        >
          {widget.zone}
        </span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
          {widget.headline}
        </span>
      </div>

      {/* Interpretation body */}
      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--sct-muted)' }}>
        {widget.body}
      </p>

      {/* Zone bar + position marker */}
      <div className="relative mb-1.5">
        <div className="flex h-1.5 rounded-full overflow-hidden">
          {widget.barZones.map((z, i) => (
            <div key={i} style={{ width: `${z.pct}%`, backgroundColor: z.color }} />
          ))}
        </div>
        <div
          className="absolute rounded-sm"
          style={{
            top: '-3px', width: '3px', height: '12px',
            left: `${Math.min(Math.max(widget.barPos, 1), 99)}%`,
            transform: 'translateX(-50%)',
            backgroundColor: '#fff',
            boxShadow: `0 0 6px ${widget.color}`,
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono mb-3" style={{ color: 'var(--sct-muted)' }}>
        {widget.barLabels.map((l, i) => <span key={i}>{l}</span>)}
      </div>

      {/* Historical context note */}
      <p
        className="text-[11px] leading-relaxed px-2.5 py-1.5 rounded"
        style={{ backgroundColor: widget.color + '12', color: widget.color }}
      >
        {widget.contextNote}
      </p>
    </div>
  );
}

function toSeries(points: OnChainPoint[], key: keyof OnChainPoint): MacroDataPoint[] {
  return points
    .filter(p => p[key] != null)
    .map(p => ({ date: p.time, value: p[key] as number }));
}

export default function OnChainPage() {
  const { data, loading } = useApiData<OnChainResponse>('/api/onchain');
  const { data: cycle }   = useApiData<CycleScoreResult>('/api/cycle');

  const mvrvInd = cycle?.indicators.find(i => i.name === 'MVRV Ratio');
  const puellInd = cycle?.indicators.find(i => i.name === 'Puell Multiple');
  const nvtInd   = cycle?.indicators.find(i => i.name === 'NVT Signal');
  const addrInd  = cycle?.indicators.find(i => i.name === 'Active Addresses');

  const cur = data?.current;
  const pts = data?.points ?? [];

  const mvrvSig = mvrvSignal(cur?.mvrvProxy ?? null);
  const puellSig = puellSignal(cur?.puell ?? null);
  const nvtSig   = nvtSignal(cur?.nvt ?? null);
  const addrSig  = addrSignal(cur?.addresses ?? null, pts);

  const widgets: Record<string, MetricWidget | null> = {
    mvrv:  buildMVRVWidget(cur?.mvrvProxy  ?? null, mvrvSig),
    puell: buildPuellWidget(cur?.puell     ?? null, puellSig),
    nvt:   buildNVTWidget(cur?.nvt         ?? null, nvtSig),
    addr:  buildAddrWidget(cur?.addresses  ?? null, addrSig, pts),
  };

  const mvrvSeries   = useMemo(() => toSeries(pts, 'mvrvProxy'),  [pts]);
  const puellSeries  = useMemo(() => toSeries(pts, 'puell'),      [pts]);
  const nvtSeries    = useMemo(() => toSeries(pts, 'nvt'),        [pts]);
  const addrSeries   = useMemo(() => toSeries(pts, 'addresses'),  [pts]);

  const CHARTS = [
    {
      title:    'MVRV Ratio (Price / 200d MA)',
      series:   mvrvSeries,
      color:    mvrvSig.color === 'var(--sct-muted)' ? '#3B82F6' : mvrvSig.color,
      unit:     '×',
      decimals: 2,
      desc:     'Price relative to the 200-day moving average. Above 2.5× has historically marked cycle tops; below 1.0× is strong accumulation.',
      ind:      mvrvInd,
      id:       'mvrv',
    },
    {
      title:    'Puell Multiple',
      series:   puellSeries,
      color:    puellSig.color === 'var(--sct-muted)' ? '#35D07F' : puellSig.color,
      unit:     '×',
      decimals: 2,
      desc:     'Daily miner revenue vs 365-day average. Below 0.5 = miner stress (buy signal). Above 4.0 = extreme miner profitability (sell signal).',
      ind:      puellInd,
      id:       'puell',
    },
    {
      title:    'NVT Signal (Network Value / Tx Count)',
      series:   nvtSeries,
      color:    nvtSig.color === 'var(--sct-muted)' ? '#E6B450' : nvtSig.color,
      unit:     'K',
      decimals: 0,
      desc:     'Market cap relative to 90-day avg transaction count. High NVT = price growth outpacing network usage = potential overvaluation.',
      ind:      nvtInd,
      id:       'nvt',
    },
    {
      title:    'Active Addresses (30d MA)',
      series:   addrSeries,
      color:    addrSig.color === 'var(--sct-muted)' ? '#A855F7' : addrSig.color,
      unit:     'K',
      decimals: 0,
      desc:     '30-day moving average of unique addresses active per day. Rising = growing adoption and network use. Declining during price rises = divergence warning.',
      ind:      addrInd,
      id:       'addr',
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="On-Chain Metrics"
        subtitle="Network health and investor behavior signals from CoinMetrics"
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          label="MVRV Ratio"
          value={cur?.mvrvProxy != null ? `${cur.mvrvProxy.toFixed(2)}×` : '—'}
          sub={mvrvSig.label}
          accent={mvrvSig.color}
          freshness="daily"
          source="CoinMetrics (proxy)"
        />
        <StatCard
          label="Puell Multiple"
          value={cur?.puell != null ? `${cur.puell.toFixed(2)}×` : '—'}
          sub={puellSig.label}
          accent={puellSig.color}
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="NVT Signal"
          value={cur?.nvt != null ? `$${cur.nvt.toFixed(0)}K/tx` : '—'}
          sub={nvtSig.label}
          accent={nvtSig.color}
          freshness="daily"
          source="CoinMetrics (proxy)"
        />
        <StatCard
          label="Active Addresses"
          value={cur?.addresses != null ? `${cur.addresses.toFixed(0)}K` : '—'}
          sub={addrSig.label}
          accent={addrSig.color}
          freshness="daily"
          source="CoinMetrics"
        />
      </div>

      {/* 2×2 chart grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {CHARTS.map(c => (
          <div
            key={c.id}
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
                {c.title}
              </p>
              {c.ind && (
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
                  backgroundColor: c.color + '20',
                  color: c.color,
                }}>
                  Score {Math.round(c.ind.score)} · {c.ind.signal}
                </span>
              )}
            </div>
            <p className="text-[11px] mb-3" style={{ color: 'var(--sct-muted)' }}>{c.desc}</p>
            {loading
              ? <ChartSkeleton height="h-44" />
              : <MacroLineChart id={c.id} data={c.series} color={c.color} unit={c.unit} decimals={c.decimals} />
            }
            {!loading && widgets[c.id] && <SignalBlock widget={widgets[c.id]!} />}
          </div>
        ))}
      </div>

      {/* Insight panel */}
      <InsightPanel title="Combined On-Chain Signal">
        <InsightRow label="MVRV Ratio"        value={mvrvSig.label}  valueColor={mvrvSig.color} />
        <InsightRow label="Puell Multiple"    value={puellSig.label} valueColor={puellSig.color} />
        <InsightRow label="NVT Signal"        value={nvtSig.label}   valueColor={nvtSig.color} />
        <InsightRow label="Active Addresses"  value={addrSig.label}  valueColor={addrSig.color} />
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          MVRV and Puell both below 1.0 simultaneously have historically marked the strongest
          multi-year accumulation windows in Bitcoin. NVT above its long-run average combined
          with declining active addresses is an early divergence warning.
        </p>
      </InsightPanel>
    </div>
  );
}

