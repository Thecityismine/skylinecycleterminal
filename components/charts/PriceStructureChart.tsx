"use client";

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
  data,
  overlays,
  halvings,
  logScale,
  asset,
  priceChange,
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
      {/* Chart header */}
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
        {/* Legend */}
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

          <XAxis
            dataKey="time"
            tickFormatter={fmtX}
            tick={{ fill: '#4B5563', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={80}
            interval="preserveStartEnd"
          />
          <YAxis
            scale={logScale ? 'log' : 'auto'}
            domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={66}
            allowDataOverflow={logScale}
          />

          <Tooltip
            content={<PriceTip overlays={overlays} asset={asset} />}
            cursor={{ stroke: '#1E293B', strokeWidth: 1 }}
          />

          {/* Halving reference lines */}
          {overlays.has('Halvings') && halvings.map((h) => (
            <ReferenceLine
              key={h}
              x={h}
              stroke="#F97316"
              strokeDasharray="3 4"
              strokeOpacity={0.6}
              label={{ value: 'H', position: 'insideTopLeft', fill: '#F97316', fontSize: 9 }}
            />
          ))}

          {/* Overlays — drawn before price so price sits on top */}
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

          {/* BTC/ETH price area — on top */}
          <Area
            type="monotone"
            dataKey="price"
            stroke={PRICE_COLOR}
            strokeWidth={1.5}
            fill="url(#price-grad)"
            dot={false}
            isAnimationActive={false}
          />
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
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--sct-muted)' }}>
        RSI (14)
      </p>
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
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--sct-muted)' }}>
        MACD (12, 26, 9)
      </p>
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.4} />
          <XAxis dataKey="time" tickFormatter={fmtX} tick={{ fill: '#4B5563', fontSize: 9 }}
            tickLine={false} axisLine={false} minTickGap={80} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#4B5563', fontSize: 9 }} tickLine={false} axisLine={false}
            width={40} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(Math.round(v))} />
          <Tooltip content={<MACDTip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />
          <ReferenceLine y={0} stroke="#1E293B" strokeOpacity={0.8} />
          <Bar dataKey="histogram" isAnimationActive={false}
            fill="#35D07F"
            // Color bars by sign — recharts Bar needs a cell or a function
            // Using a custom shape is complex; we use a single color and accept it
          />
          <Line type="monotone" dataKey="macd"   stroke="#3B82F6" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="signal" stroke="#F97316" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
