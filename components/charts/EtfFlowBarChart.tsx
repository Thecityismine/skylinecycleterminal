"use client";

import {
  ComposedChart, Bar, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ChartWatermark } from './ChartWatermark';
import type { EtfFlowPoint } from '@/lib/indicators/etfFlows';

type Props = {
  data: EtfFlowPoint[];
  showRolling7: boolean;
  showRolling30: boolean;
  showBtcOverlay: boolean;
};

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtFlow(v: number): string {
  const abs = Math.abs(v);
  const sign = v >= 0 ? '+' : '-';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtUSD(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtDate(v: string): string {
  return new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
  showRolling7: boolean;
  showRolling30: boolean;
  showBtcOverlay: boolean;
}

function CustomTooltip({ active, payload, label, showRolling7, showRolling30, showBtcOverlay }: TooltipProps) {
  if (!active || !payload || !label) return null;

  const get = (name: string) => payload.find(p => p.name === name)?.value ?? null;
  const netFlow   = get('totalNetFlowUsd');
  const rolling7  = showRolling7  ? get('rolling7')  : null;
  const rolling30 = showRolling30 ? get('rolling30') : null;
  const btcClose  = showBtcOverlay ? get('btcClose') : null;

  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const flowColor = netFlow == null ? '#94A3B8' : netFlow >= 0 ? '#35D07F' : '#F85149';

  return (
    <div style={{
      backgroundColor: 'var(--sct-card)', border: '1px solid var(--sct-border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12, lineHeight: 1.7, minWidth: 200,
    }}>
      <p style={{ color: 'var(--sct-muted)', marginBottom: 6, fontSize: 11 }}>{date}</p>
      {netFlow != null && (
        <p style={{ color: flowColor }}>
          <span style={{ color: 'var(--sct-muted)' }}>Net Flow  </span>
          {fmtFlow(netFlow)}
        </p>
      )}
      {rolling7 != null && (
        <p style={{ color: '#5B84FF' }}>
          <span style={{ color: 'var(--sct-muted)' }}>7D Rolling  </span>
          {fmtFlow(rolling7)}
        </p>
      )}
      {rolling30 != null && (
        <p style={{ color: '#EAB84D' }}>
          <span style={{ color: 'var(--sct-muted)' }}>30D Rolling  </span>
          {fmtFlow(rolling30)}
        </p>
      )}
      {btcClose != null && (
        <p style={{ color: 'rgba(230,237,243,0.6)' }}>
          <span style={{ color: 'var(--sct-muted)' }}>BTC  </span>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(btcClose)}
        </p>
      )}
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function EtfFlowBarChart({ data, showRolling7, showRolling30, showBtcOverlay }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--sct-muted)', fontSize: 13 }}>No data available</p>
      </div>
    );
  }

  const showOverlay = showBtcOverlay;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ChartWatermark />
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: showOverlay ? 72 : 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" vertical={false} />

          <XAxis
            dataKey="time"
            tickFormatter={fmtDate}
            minTickGap={80}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          {/* Left: ETF flows */}
          <YAxis
            yAxisId="flow"
            tickFormatter={v => fmtFlow(v)}
            width={72}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          {/* Right: BTC price (only rendered when showOverlay) */}
          {showOverlay && (
            <YAxis
              yAxisId="btc"
              orientation="right"
              tickFormatter={fmtUSD}
              width={60}
              tick={{ fill: '#4B5563', fontSize: 10 }}
            />
          )}

          <ReferenceLine yAxisId="flow" y={0} stroke="#8B949E" strokeWidth={1} />

          {/* Daily net flow bars */}
          <Bar yAxisId="flow" dataKey="totalNetFlowUsd" name="totalNetFlowUsd" maxBarSize={12} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.totalNetFlowUsd >= 0 ? '#35D07F' : '#F85149'}
                fillOpacity={entry.isHighInflow || entry.isHighOutflow ? 1 : 0.75}
              />
            ))}
          </Bar>

          {/* 7D rolling */}
          {showRolling7 && (
            <Line
              yAxisId="flow"
              type="monotone"
              dataKey="rolling7"
              name="rolling7"
              stroke="#5B84FF"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* 30D rolling */}
          {showRolling30 && (
            <Line
              yAxisId="flow"
              type="monotone"
              dataKey="rolling30"
              name="rolling30"
              stroke="#EAB84D"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* BTC price overlay */}
          {showOverlay && (
            <Line
              yAxisId="btc"
              type="monotone"
              dataKey="btcClose"
              name="btcClose"
              stroke="rgba(230,237,243,0.28)"
              strokeWidth={1.2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          <Tooltip
            content={
              <CustomTooltip
                showRolling7={showRolling7}
                showRolling30={showRolling30}
                showBtcOverlay={showBtcOverlay}
              />
            }
            cursor={{ stroke: 'rgba(139,148,158,0.15)', strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
