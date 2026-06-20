"use client";

import { useMemo } from 'react';
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';

type DataPoint = {
  time: string;
  price: number;
  dma200: number | null;
  ma2y:   number | null;
  logReg: number | null;
  rsi:    number | null;
  macd:   number | null;
  signal: number | null;
  histogram: number | null;
};

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

function fmtX(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtFull(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── RSI signal logic ─────────────────────────────────────────────────────────

type RSISignal = {
  rsi:          number;
  zone:         string;
  zoneColor:    string;
  zoneDesc:     string;
  momentum:     number;
  momLabel:     string;
  momColor:     string;
  aboveMidline: boolean;
};

function computeRSISignal(data: DataPoint[]): RSISignal | null {
  const pts = data.filter(d => d.rsi != null);
  if (pts.length < 6) return null;
  const curr = pts[pts.length - 1];
  const prev = pts[pts.length - 6];   // ~5 bars back
  const rsi  = curr.rsi!;
  const momentum = rsi - (prev.rsi ?? rsi);

  let zone: string, zoneColor: string, zoneDesc: string;

  if (rsi > 80) {
    zone = 'Extremely Overbought'; zoneColor = '#FF5C5C';
    zoneDesc = 'RSI above 80. BTC has historically corrected 20–50% from these levels. Prior cycle peaks formed here.';
  } else if (rsi > 70) {
    zone = 'Overbought'; zoneColor = '#FF5C5C';
    zoneDesc = 'Overbought territory. Momentum is extended. Watch for bearish divergence or slowing histogram on MACD.';
  } else if (rsi > 60) {
    zone = 'Bullish'; zoneColor = '#35D07F';
    zoneDesc = 'RSI above 60. Bull trend intact. Price above 50-line confirms buyers are in control.';
  } else if (rsi > 50) {
    zone = 'Neutral-Bullish'; zoneColor = '#35D07F';
    zoneDesc = 'RSI hovering above 50. Slight bullish edge but momentum is not yet strong. A push above 60 would confirm.';
  } else if (rsi > 40) {
    zone = 'Neutral-Bearish'; zoneColor = '#E6B450';
    zoneDesc = 'RSI below midline. Bears have the edge. Look for RSI to reclaim 50 before turning bullish.';
  } else if (rsi > 30) {
    zone = 'Weak'; zoneColor = '#E6B450';
    zoneDesc = 'RSI in the 30–40 range. Downtrend or accumulation phase. BTC often sees range compression here.';
  } else if (rsi > 20) {
    zone = 'Oversold'; zoneColor = '#3B82F6';
    zoneDesc = 'RSI below 30. Historically one of the strongest long-term buying zones for BTC. Patience required.';
  } else {
    zone = 'Deeply Oversold'; zoneColor = '#3B82F6';
    zoneDesc = 'RSI below 20. Deep capitulation territory. These readings have marked major BTC generational lows.';
  }

  const momLabel = momentum > 1.5 ? 'Rising' : momentum < -1.5 ? 'Falling' : 'Flat';
  const momColor = momentum > 1.5 ? '#35D07F' : momentum < -1.5 ? '#FF5C5C' : '#6F7A86';

  return { rsi, zone, zoneColor, zoneDesc, momentum, momLabel, momColor, aboveMidline: rsi > 50 };
}

// ─── MACD signal logic ────────────────────────────────────────────────────────

type MACDCrossover = { type: 'bullish' | 'bearish'; barsAgo: number };

type MACDSignal = {
  macd:            number;
  sig:             number;
  hist:            number;
  crossover:       MACDCrossover | null;
  macdAboveSignal: boolean;
  aboveZero:       boolean;
  histExpanding:   boolean;
  histPositive:    boolean;
};

function computeMACDSignal(data: DataPoint[]): MACDSignal | null {
  const pts = data.filter(d => d.macd != null && d.signal != null);
  if (pts.length < 4) return null;

  const curr = pts[pts.length - 1];
  const macd = curr.macd!;
  const sig  = curr.signal!;
  const hist = curr.histogram ?? 0;

  // Crossover detection — scan back up to 60 bars
  let crossover: MACDCrossover | null = null;
  for (let i = pts.length - 1; i >= Math.max(1, pts.length - 61); i--) {
    const c = pts[i];
    const p = pts[i - 1];
    if (c.macd == null || c.signal == null || p.macd == null || p.signal == null) continue;
    const nowAbove  = c.macd > c.signal;
    const prevAbove = p.macd > p.signal;
    if (nowAbove && !prevAbove) { crossover = { type: 'bullish', barsAgo: pts.length - 1 - i }; break; }
    if (!nowAbove && prevAbove) { crossover = { type: 'bearish', barsAgo: pts.length - 1 - i }; break; }
  }

  // Histogram momentum — compare to 3 bars ago
  const lookback = Math.min(3, pts.length - 1);
  const prevHist  = pts[pts.length - 1 - lookback].histogram ?? 0;
  const histExpanding = Math.abs(hist) > Math.abs(prevHist);

  return {
    macd, sig, hist,
    crossover,
    macdAboveSignal: macd > sig,
    aboveZero:       macd > 0,
    histExpanding,
    histPositive:    hist >= 0,
  };
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function PriceTip({
  active, payload, label, overlays, asset,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null }>;
  label?: string;
  overlays: Set<string>;
  asset: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const get = (name: string) => payload.find((p) => p.name === name)?.value ?? null;
  const price  = get('price');
  const dma200 = get('dma200');
  const ma2y   = get('ma2y');
  const logReg = get('logReg');

  return (
    <div className="rounded-lg border px-3 py-2.5 text-xs font-mono space-y-1" style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}>
      <p style={{ color: '#4B5563' }}>{fmtFull(label)}</p>
      {price   != null && <p style={{ color: asset === 'eth' ? '#627EEA' : '#F7931A' }}>{asset.toUpperCase()} <span className="font-bold">${Math.round(price).toLocaleString()}</span></p>}
      {overlays.has('200 DMA') && dma200 != null && <p style={{ color: '#3B82F6' }}>200 DMA <span className="font-bold">${Math.round(dma200).toLocaleString()}</span></p>}
      {overlays.has('2Y MA')   && ma2y   != null && <p style={{ color: '#35D07F' }}>2Y MA   <span className="font-bold">${Math.round(ma2y).toLocaleString()}</span></p>}
      {overlays.has('Log Regression') && logReg != null && <p style={{ color: '#A855F7' }}>Fair Value <span className="font-bold">${Math.round(logReg).toLocaleString()}</span></p>}
    </div>
  );
}

// ─── Main price chart ────────────────────────────────────────────────────────

export function PriceStructureChart({
  data, overlays, halvings, logScale, asset, priceChange,
}: {
  data:        DataPoint[];
  overlays:    Set<string>;
  halvings:    string[];
  logScale:    boolean;
  asset:       string;
  priceChange: number | null;
}) {
  const PRICE_COLOR = asset === 'eth' ? '#627EEA' : '#F7931A';
  const latest = data[data.length - 1];

  return (
    <div className="rounded-xl border p-6 space-y-1" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-2xl font-mono font-bold" style={{ color: PRICE_COLOR }}>
            ${Math.round(latest.price).toLocaleString()}
          </p>
          {priceChange != null && (
            <p className="text-xs font-mono mt-0.5" style={{ color: priceChange >= 0 ? '#35D07F' : '#FF5C5C' }}>
              {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(1)}% over period
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-end text-xs font-mono">
          <span style={{ color: PRICE_COLOR }}>● {asset.toUpperCase()} Price</span>
          {overlays.has('200 DMA') && <span style={{ color: '#3B82F6' }}>── 200 DMA</span>}
          {overlays.has('2Y MA')   && <span style={{ color: '#35D07F' }}>── 2Y MA</span>}
          {overlays.has('Log Regression') && <span style={{ color: '#A855F7' }}>╌ Fair Value</span>}
          {overlays.has('Halvings')        && <span style={{ color: '#F97316' }}>│ Halvings</span>}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="price-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={PRICE_COLOR} stopOpacity={0.2} />
              <stop offset="100%" stopColor={PRICE_COLOR} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.6} />
          <XAxis dataKey="time" tickFormatter={fmtX}
            tick={{ fill: '#4B5563', fontSize: 10 }} tickLine={false}
            axisLine={{ stroke: '#1E293B' }} minTickGap={80} interval="preserveStartEnd" />
          <YAxis scale={logScale ? 'log' : 'auto'} domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
            tickFormatter={fmtY} tick={{ fill: '#4B5563', fontSize: 10 }}
            tickLine={false} axisLine={false} width={66} allowDataOverflow={logScale} />
          <Tooltip content={<PriceTip overlays={overlays} asset={asset} />}
            cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />
          {overlays.has('Halvings') && halvings.map((h) => (
            <ReferenceLine key={h} x={h} stroke="#F97316" strokeDasharray="3 4" strokeOpacity={0.6}
              label={{ value: 'H', position: 'insideTopLeft', fill: '#F97316', fontSize: 9 }} />
          ))}
          {overlays.has('Log Regression') && (
            <Line type="monotone" dataKey="logReg" stroke="#A855F7" strokeWidth={1.5}
              strokeDasharray="5 3" dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlays.has('2Y MA') && (
            <Line type="monotone" dataKey="ma2y" stroke="#35D07F" strokeWidth={1.5}
              dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlays.has('200 DMA') && (
            <Line type="monotone" dataKey="dma200" stroke="#3B82F6" strokeWidth={1.5}
              dot={false} isAnimationActive={false} connectNulls />
          )}
          <Area type="monotone" dataKey="price" stroke={PRICE_COLOR} strokeWidth={1.5}
            fill="url(#price-grad)" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── RSI panel ───────────────────────────────────────────────────────────────

function RSITip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number | null }>; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  const v = payload[0].value;
  return (
    <div className="rounded border px-2 py-1.5 text-xs font-mono" style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}>
      <p style={{ color: '#4B5563' }}>{fmtX(label)}</p>
      {v != null && (
        <p style={{ color: v > 70 ? '#FF5C5C' : v < 30 ? '#3B82F6' : '#94A3B8' }}>
          RSI <span className="font-bold">{v.toFixed(1)}</span>
        </p>
      )}
    </div>
  );
}

export function RSIPanel({ data }: { data: DataPoint[] }) {
  const signal = useMemo(() => computeRSISignal(data), [data]);

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
          RSI (14)
        </p>
        {signal && (
          <div className="flex items-center gap-2">
            <span className="text-base font-mono font-bold" style={{ color: signal.zoneColor }}>
              {signal.rsi.toFixed(1)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide"
              style={{ backgroundColor: signal.zoneColor + '1A', color: signal.zoneColor, border: `1px solid ${signal.zoneColor}40` }}>
              {signal.zone}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.4} />
          <XAxis dataKey="time" tickFormatter={fmtX} tick={{ fill: '#4B5563', fontSize: 9 }}
            tickLine={false} axisLine={false} minTickGap={80} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fill: '#4B5563', fontSize: 9 }}
            tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<RSITip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />
          <ReferenceLine y={70} stroke="#FF5C5C" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={30} stroke="#3B82F6" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={50} stroke="#1E293B" strokeOpacity={0.5} />
          <Line type="monotone" dataKey="rsi" stroke="#E6B450" strokeWidth={1.5}
            dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Signal widget */}
      {signal && (
        <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--sct-border)' }}>
          <p className="text-xs leading-relaxed" style={{ color: signal.zoneColor }}>
            {signal.zoneDesc}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: signal.momColor }}>
              {signal.momLabel === 'Rising' ? '↑' : signal.momLabel === 'Falling' ? '↓' : '→'}
              {' '}Momentum {signal.momLabel}
            </span>
            <span className="text-[11px] font-medium" style={{ color: signal.aboveMidline ? '#35D07F' : '#E6B450' }}>
              {signal.aboveMidline ? '◉ Above 50 · bullish bias' : '◎ Below 50 · bearish bias'}
            </span>
          </div>
          {/* Zone guide */}
          <div className="grid grid-cols-4 gap-px pt-1 rounded-lg overflow-hidden" style={{ height: 6 }}>
            {[
              { range: '0–30',  color: '#3B82F6',  active: signal.rsi <= 30 },
              { range: '30–50', color: '#E6B450',  active: signal.rsi > 30 && signal.rsi <= 50 },
              { range: '50–70', color: '#35D07F',  active: signal.rsi > 50 && signal.rsi <= 70 },
              { range: '70+',   color: '#FF5C5C',  active: signal.rsi > 70 },
            ].map(z => (
              <div key={z.range} className="h-full transition-all"
                style={{ backgroundColor: z.active ? z.color : z.color + '30' }} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-px">
            {[
              { label: 'Oversold', color: '#3B82F6' },
              { label: 'Weak',     color: '#E6B450' },
              { label: 'Bullish',  color: '#35D07F' },
              { label: 'Overbought', color: '#FF5C5C' },
            ].map(z => (
              <p key={z.label} className="text-[9px] text-center" style={{ color: z.color + 'AA' }}>{z.label}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MACD panel ──────────────────────────────────────────────────────────────

function MACDTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number | null }>; label?: string }) {
  if (!active || !payload?.length || !label) return null;
  const macd = payload.find(p => p.name === 'macd')?.value;
  const sig  = payload.find(p => p.name === 'signal')?.value;
  const hist = payload.find(p => p.name === 'histogram')?.value;
  return (
    <div className="rounded border px-2 py-1.5 text-xs font-mono space-y-0.5" style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}>
      <p style={{ color: '#4B5563' }}>{fmtX(label)}</p>
      {macd != null && <p style={{ color: '#3B82F6' }}>MACD <span className="font-bold">{macd.toFixed(0)}</span></p>}
      {sig  != null && <p style={{ color: '#F97316' }}>Signal <span className="font-bold">{sig.toFixed(0)}</span></p>}
      {hist != null && <p style={{ color: hist >= 0 ? '#35D07F' : '#FF5C5C' }}>Hist <span className="font-bold">{hist.toFixed(0)}</span></p>}
    </div>
  );
}

export function MACDPanel({ data }: { data: DataPoint[] }) {
  const signal = useMemo(() => computeMACDSignal(data), [data]);

  const signalColor = signal?.macdAboveSignal ? '#35D07F' : '#FF5C5C';
  const signalLabel = signal?.macdAboveSignal ? 'BULLISH' : 'BEARISH';

  // Crossover text
  const crossoverText = signal?.crossover
    ? signal.crossover.barsAgo === 0
      ? 'today'
      : signal.crossover.barsAgo === 1
        ? 'yesterday'
        : `${signal.crossover.barsAgo} days ago`
    : null;

  const crossoverColor = signal?.crossover?.type === 'bullish' ? '#35D07F' : '#FF5C5C';

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
          MACD (12, 26, 9)
        </p>
        {signal && (
          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide"
            style={{ backgroundColor: signalColor + '1A', color: signalColor, border: `1px solid ${signalColor}40` }}>
            {signalLabel}
          </span>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.4} />
          <XAxis dataKey="time" tickFormatter={fmtX} tick={{ fill: '#4B5563', fontSize: 9 }}
            tickLine={false} axisLine={false} minTickGap={80} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#4B5563', fontSize: 9 }} tickLine={false} axisLine={false}
            width={40} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(Math.round(v))} />
          <Tooltip content={<MACDTip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />
          <ReferenceLine y={0} stroke="#1E293B" strokeOpacity={0.8} />
          <Bar dataKey="histogram" isAnimationActive={false} fill="#35D07F" />
          <Line type="monotone" dataKey="macd"   stroke="#3B82F6" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="signal" stroke="#F97316" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Signal widget */}
      {signal && (
        <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--sct-border)' }}>
          {/* Crossover alert */}
          {signal.crossover ? (
            <div className="flex items-start gap-2 rounded-lg px-2.5 py-2"
              style={{ backgroundColor: crossoverColor + '12', border: `1px solid ${crossoverColor}35` }}>
              <span className="text-sm mt-px" style={{ color: crossoverColor }}>
                {signal.crossover.type === 'bullish' ? '▲' : '▼'}
              </span>
              <div>
                <p className="text-xs font-semibold" style={{ color: crossoverColor }}>
                  {signal.crossover.type === 'bullish' ? 'Bullish' : 'Bearish'} Crossover
                  {' '}<span className="font-normal opacity-70">· {crossoverText}</span>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                  {signal.crossover.type === 'bullish'
                    ? 'MACD crossed above signal line. Momentum turning positive — watch for zero-line confirmation.'
                    : 'MACD crossed below signal line. Momentum turning negative — risk-off until bulls reclaim the crossover.'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              {signal.macdAboveSignal
                ? 'MACD above signal — momentum favors bulls. No crossover detected in the last 60 bars.'
                : 'MACD below signal — momentum favors bears. No crossover detected in the last 60 bars.'}
            </p>
          )}

          {/* Sub-signals row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-[11px] font-medium" style={{ color: signal.aboveZero ? '#35D07F' : '#E6B450' }}>
              {signal.aboveZero ? '◉' : '◎'} Zero line {signal.aboveZero ? 'above · bullish' : 'below · bearish'}
            </span>
            <span className="text-[11px] font-medium" style={{ color: signal.histExpanding ? signalColor : '#6F7A86' }}>
              {signal.histExpanding ? '◉' : '◎'} Histogram {signal.histExpanding ? 'expanding · strengthening' : 'contracting · weakening'}
            </span>
          </div>

          {/* Interpretation summary */}
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            {signal.macdAboveSignal && signal.aboveZero && signal.histExpanding &&
              'All three MACD components are bullish. Strongest momentum signal — price often extends further.'}
            {signal.macdAboveSignal && signal.aboveZero && !signal.histExpanding &&
              'Bullish but momentum is fading. Consider whether this is a pause or reversal.'}
            {signal.macdAboveSignal && !signal.aboveZero &&
              'MACD above signal but still below zero. Early-stage recovery — confirm with RSI above 50.'}
            {!signal.macdAboveSignal && !signal.aboveZero && !signal.histExpanding &&
              'Bearish across all three components. Strongest bear signal — sellers remain in control.'}
            {!signal.macdAboveSignal && !signal.aboveZero && signal.histExpanding &&
              'Bearish but selling momentum is building further. Capitulation risk remains elevated.'}
            {!signal.macdAboveSignal && signal.aboveZero &&
              'MACD below signal but still above zero. Potential distribution phase — watch for zero-line break.'}
          </p>
        </div>
      )}
    </div>
  );
}
