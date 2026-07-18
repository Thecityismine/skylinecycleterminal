"use client";

import Link from 'next/link';
import { ROTATION_TABS } from '@/lib/rotation/tabConfig';
import { fmtRotationValue } from './RotationChart';

type ApiTab = {
  key:         string;
  score:       number;
  regimeLabel: string;
  regimeColor: string;
  points:      { value: number }[];
};

type Props = {
  tabs:     ApiTab[] | undefined;
  loading:  boolean;
  pathname: string;
};

export function RotationOverviewGrid({ tabs, loading, pathname }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {ROTATION_TABS.map((cfg) => {
        const apiTab = tabs?.find((t) => t.key === cfg.key);
        const last = apiTab?.points[apiTab.points.length - 1];

        return (
          <Link
            key={cfg.key}
            href={`${pathname}?tab=${cfg.key}`}
            className="rounded-xl border p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5"
            style={{
              backgroundColor: 'var(--sct-card)',
              borderColor:     apiTab ? apiTab.regimeColor : 'var(--sct-border)',
              borderLeftWidth: 4,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>{cfg.ticker}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>{cfg.navLabel}</p>
              </div>
              {apiTab && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                  style={{ backgroundColor: apiTab.regimeColor + '20', color: apiTab.regimeColor }}
                >
                  {apiTab.regimeLabel}
                </span>
              )}
            </div>

            <p className="text-xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
              {loading || !last ? '—' : fmtRotationValue(last.value, cfg.isRatio)}
            </p>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{cfg.description}</p>

            {apiTab && (
              <div className="flex items-center gap-2 mt-auto pt-1">
                <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-panel)' }}>
                  <div className="h-full rounded-full" style={{ width: `${apiTab.score}%`, backgroundColor: apiTab.regimeColor }} />
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: apiTab.regimeColor }}>{apiTab.score}</span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
