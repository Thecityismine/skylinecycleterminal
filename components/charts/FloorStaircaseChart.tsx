"use client";

import { useMemo } from 'react';
import type { YearlyLow } from '@/lib/indicators/yearlyLows';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(0)}%`;
}

function rowColor(d: YearlyLow): { bg: string; text: string; border: string } {
  if (d.prevYearLow == null) return { bg: '#94A3B808', text: '#94A3B8', border: '#94A3B820' };
  if (d.isPartialYear) return { bg: '#A78BFA08', text: '#A78BFA', border: '#A78BFA30' };
  if (d.lowPrice >= d.prevYearLow) return { bg: '#35D07F08', text: '#35D07F', border: '#35D07F20' };
  return { bg: '#FF5C5C08', text: '#FF5C5C', border: '#FF5C5C20' };
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function FloorStaircaseChart({ data }: { data: YearlyLow[] }) {
  const maxPrice = useMemo(() => Math.max(...data.map((d) => d.lowPrice)), [data]);

  return (
    <div className="space-y-1.5">
      {[...data].reverse().map((d) => {
        const { bg, text, border } = rowColor(d);
        const barWidth = Math.max(2, (Math.log10(d.lowPrice) / Math.log10(maxPrice)) * 100);

        return (
          <div
            key={d.year}
            className="flex items-center gap-3 rounded-lg px-3 py-2 border"
            style={{ backgroundColor: bg, borderColor: border }}
          >
            {/* Year + halving badge */}
            <div className="w-20 shrink-0 flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold" style={{ color: text }}>
                {d.year}
              </span>
              {d.halvingYear && (
                <span className="text-[9px] px-1 rounded" style={{ backgroundColor: '#F7931A20', color: '#F7931A' }}>
                  H
                </span>
              )}
              {d.isPartialYear && (
                <span className="text-[9px] px-1 rounded" style={{ backgroundColor: '#A78BFA20', color: '#A78BFA' }}>
                  YTD
                </span>
              )}
            </div>

            {/* Log-scale bar */}
            <div className="flex-1 relative h-4 rounded-sm overflow-hidden" style={{ backgroundColor: '#1E293B' }}>
              <div
                className="absolute left-0 top-0 h-full rounded-sm"
                style={{ width: `${barWidth}%`, backgroundColor: text, opacity: 0.35 }}
              />
            </div>

            {/* Price */}
            <span className="w-20 text-right font-mono text-xs font-semibold shrink-0" style={{ color: text }}>
              {fmtUSD(d.lowPrice)}
            </span>

            {/* YoY change */}
            <span
              className="w-16 text-right font-mono text-xs shrink-0"
              style={{ color: d.yoyChange == null ? '#4B5563' : d.yoyChange >= 0 ? '#35D07F' : '#FF5C5C' }}
            >
              {fmtPct(d.yoyChange)}
            </span>

            {/* Context */}
            <span className="hidden md:block w-36 text-right text-xs truncate" style={{ color: '#4B5563' }}>
              {d.cycleContext}
            </span>
          </div>
        );
      })}
    </div>
  );
}
