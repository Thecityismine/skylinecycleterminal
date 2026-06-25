"use client";

import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ChartWatermark } from './ChartWatermark';
import type { EtfFlowPoint } from '@/lib/indicators/etfFlows';

type Props = {
  data: EtfFlowPoint[];
  showBtcOverlay: boolean;
};

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

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null }>;
  label?: string;
  showBtcOverlay: boolean;
}

function CustomTooltip({ active, payload, label, showBtcOverlay }: TooltipProps) {
  if (!active || !payload || !label) return null;

  const get = (name: string) => payload.find(p => p.name === name)?.value ?? null;
  const cum    = get('cumulative');
  const btc    = showBtcOverlay ? get('btcClose') : null;

  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const cumColor = cum == null ? '#94A3B8' : cum >= 0 ? '#35D07F' : '#F85149';

  return (
    <div style={{
      backgroundColor: 'var(--sct-card)', border: '1px solid var(--sct-border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12, lineHeight: 1.7, minWidth: 200,
    }}>
      <p style={{ color: 'var(--sct-muted)', marginBottom: 6, fontSize: 11 }}>{date}</p>
      {cum != null && (
        <p style={{ color: cumColor }}>
          <span style={{ color: 'var(--sct-muted)' }}>Cumulative Flow  </span>
          {fmtFlow(cum)}
        </p>
      )}
      {btc != null && (
        <p style={{ color: 'rgba(230,237,243,0.6)' }}>
          <span style={{ color: 'var(--sct-muted)' }}>BTC  </span>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(btc)}
        </p>
      )}
    </div>
  );
}

export function EtfCumulativeChart({ data, showBtcOverlay }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--sct-muted)', fontSize: 13 }}>No data available</p>
      </div>
    );
  }

  const lastCum = data[data.length - 1].cumulative;
  const fillColor = lastCum >= 0 ? '#35D07F' : '#F85149';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ChartWatermark />
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: showBtcOverlay ? 72 : 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" vertical={false} />

          <XAxis
            dataKey="time"
            tickFormatter={fmtDate}
            minTickGap={80}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          <YAxis
            yAxisId="cum"
            tickFormatter={v => fmtFlow(v)}
            width={72}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          {showBtcOverlay && (
            <YAxis
              yAxisId="btc"
              orientation="right"
              tickFormatter={fmtUSD}
              width={60}
              tick={{ fill: '#4B5563', fontSize: 10 }}
            />
          )}

          <ReferenceLine yAxisId="cum" y={0} stroke="#8B949E" strokeWidth={1} />

          <Area
            yAxisId="cum"
            type="monotone"
            dataKey="cumulative"
            name="cumulative"
            stroke={fillColor}
            strokeWidth={2}
            fill={fillColor + '15'}
            dot={false}
            isAnimationActive={false}
          />

          {showBtcOverlay && (
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
            content={<CustomTooltip showBtcOverlay={showBtcOverlay} />}
            cursor={{ stroke: 'rgba(139,148,158,0.15)', strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
