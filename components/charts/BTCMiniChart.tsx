"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

type PricePoint = { time: string; price: number };

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtX(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Tip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const price = payload[0].value;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs font-mono"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p style={{ color: '#4B5563' }}>
        {new Date(label + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
      <p className="mt-1" style={{ color: '#F7931A' }}>
        BTC <span className="font-bold">${Math.round(price).toLocaleString()}</span>
      </p>
    </div>
  );
}

export function BTCMiniChart({ data }: { data: PricePoint[] }) {
  if (!data.length) return null;

  // Strip zero/null prices before computing stats — CoinMetrics can return 0 as a placeholder
  const clean = data.filter((d) => d.price > 0);
  if (!clean.length) return null;

  const prices = clean.map((d) => d.price);
  const high  = Math.max(...prices);
  const low   = Math.min(...prices);
  const last  = clean[clean.length - 1].price;
  const first = clean[0].price;
  const isUp  = last >= first;

  const yMin = Math.floor(low  * 0.97 / 1000) * 1000;
  const yMax = Math.ceil (high * 1.02 / 1000) * 1000;

  return (
    <div
      className="rounded-xl border p-6"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
            BTC / USD — 365 Days
          </p>
          <p className="text-2xl font-mono font-bold mt-1" style={{ color: '#F7931A' }}>
            ${Math.round(last).toLocaleString()}
          </p>
        </div>
        <div className="text-right text-xs font-mono space-y-1">
          <p style={{ color: 'var(--sct-muted)' }}>52W High <span style={{ color: '#35D07F' }}>${Math.round(high).toLocaleString()}</span></p>
          <p style={{ color: 'var(--sct-muted)' }}>52W Low  <span style={{ color: '#FF5C5C' }}>${Math.round(low).toLocaleString()}</span></p>
          <p style={{ color: isUp ? '#35D07F' : '#FF5C5C' }}>
            {isUp ? '▲' : '▼'} {Math.abs(((last - first) / first) * 100).toFixed(1)}% YTD
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={clean} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="btc-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#F7931A" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#F7931A" stopOpacity={0}    />
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
            domain={[yMin, yMax]}
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={62}
          />

          <Tooltip content={<Tip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="price"
            stroke="#F7931A"
            strokeWidth={1.5}
            fill="url(#btc-grad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
