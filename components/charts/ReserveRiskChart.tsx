"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { RRPoint, RRZones } from '@/lib/indicators/reserveRisk';

type Props = {
  data:  RRPoint[];
  zones: RRZones;
};

// Known cycle tops and bottoms for vertical marker lines
const CYCLE_EVENTS = [
  { date: '2013-04-09', label: 'Top',    color: '#FF5C5C' },
  { date: '2013-11-29', label: 'Top',    color: '#FF5C5C' },
  { date: '2015-01-14', label: 'Bottom', color: '#3B82F6' },
  { date: '2017-12-17', label: 'Top',    color: '#FF5C5C' },
  { date: '2018-12-15', label: 'Bottom', color: '#3B82F6' },
  { date: '2021-11-10', label: 'Top',    color: '#FF5C5C' },
  { date: '2022-11-21', label: 'Bottom', color: '#3B82F6' },
];

const LOG_TICKS   = [100, 1_000, 10_000, 100_000, 1_000_000];
const YEAR_TICKS  = Array.from({ length: 14 }, (_, i) =>
  `${2012 + i}-01-01`,
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtRR(v: number): string {
  return v.toFixed(5);
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as RRPoint;
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[180px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        {d.price != null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.price)}
            </span>
          </div>
        )}
        {d.reserveRisk != null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Reserve Risk</span>
            <span className="text-xs font-mono" style={{ color: '#A855F7' }}>
              {fmtRR(d.reserveRisk)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReserveRiskChart({ data, zones }: Props) {
  if (!data || data.length === 0) return null;

  const rrData   = data.filter((d) => d.reserveRisk != null);
  const maxRR    = Math.max(...rrData.map((d) => d.reserveRisk!)) * 1.15;
  const rrTicks  = [zones.accumulate, zones.caution, zones.distribution].map(
    (v) => +v.toFixed(5),
  );

  return (
    <div className="flex flex-col gap-0">
      {/* ── Top panel: BTC price log scale ── */}
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

            {/* Cycle event markers */}
            {CYCLE_EVENTS.map((ev) => (
              <ReferenceLine
                key={ev.date}
                x={ev.date}
                stroke={ev.color}
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeOpacity={0.45}
              />
            ))}

            <XAxis
              dataKey="time"
              ticks={YEAR_TICKS}
              tickFormatter={(d) => new Date(d + 'T00:00:00').getFullYear().toString()}
              tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              scale="log"
              domain={[100, 'auto']}
              ticks={LOG_TICKS}
              tickFormatter={fmtPrice}
              tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              width={56}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="price"
              stroke="rgba(247,249,252,0.85)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bottom panel: Reserve Risk with zone bands ── */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rrData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

            {/* Cycle event markers */}
            {CYCLE_EVENTS.map((ev) => (
              <ReferenceLine
                key={ev.date}
                x={ev.date}
                stroke={ev.color}
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeOpacity={0.45}
              />
            ))}

            {/* Zone backgrounds */}
            <ReferenceArea y1={0}                   y2={zones.accumulate}   fill="#3B82F6" fillOpacity={0.10} />
            <ReferenceArea y1={zones.accumulate}     y2={zones.caution}      fill="#35D07F" fillOpacity={0.07} />
            <ReferenceArea y1={zones.caution}        y2={zones.distribution} fill="#E6B450" fillOpacity={0.09} />
            <ReferenceArea y1={zones.distribution}   y2={maxRR}              fill="#FF5C5C" fillOpacity={0.10} />

            {/* Zone boundary lines */}
            {rrTicks.map((v, i) => (
              <ReferenceLine
                key={v}
                y={v}
                stroke={['#3B82F6', '#E6B450', '#FF5C5C'][i]}
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                label={{
                  value: ['Accumulate', 'Caution', 'Late Cycle'][i],
                  position: 'insideTopRight',
                  fill: ['#3B82F6', '#E6B450', '#FF5C5C'][i],
                  fontSize: 9,
                  opacity: 0.75,
                }}
              />
            ))}

            <XAxis
              dataKey="time"
              ticks={YEAR_TICKS}
              tickFormatter={(d) => new Date(d + 'T00:00:00').getFullYear().toString()}
              tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, maxRR]}
              ticks={rrTicks}
              tickFormatter={fmtRR}
              tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              width={56}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="reserveRisk"
              stroke="#A855F7"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
