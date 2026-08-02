"use client";

import { useApiData } from '@/lib/hooks/useApiData';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

type Props = {
  macroScore: number | null;
  macroBand:  string;
  macroColor: string;
};

/**
 * Reads the two scores together. They are deliberately independent:
 *
 *   Skyline Cycle Score — low = Bitcoin is cheap against its own history
 *   Macro Risk Score    — high = the outside world is working against Bitcoin
 *
 * The combination that matters most is a low Cycle Score sitting under a high
 * Macro Risk Score: historically attractive, but with the financial system still
 * pushing the other way. That gap is what explains a falling price while
 * valuation models flash accumulation.
 */
function readCombination(cycle: number, macro: number): { title: string; body: string } {
  const cheap     = cycle < 40;
  const expensive = cycle >= 60;
  const hostile   = macro >= 55;
  const friendly  = macro < 45;

  if (cheap && hostile) return {
    title: 'Historically attractive — but macro is still fighting it',
    body:  'Long-term valuation signals are in the range that has previously marked accumulation, while the broader financial system is still withdrawing support. This is the combination that explains a price that keeps falling even as on-chain models say value. It has historically rewarded patience over urgency.',
  };
  if (cheap && friendly) return {
    title: 'Attractive valuation with macro support',
    body:  'Cycle signals are in accumulation territory and the macro backdrop is not fighting them. Across prior cycles this overlap has been rare, short-lived, and the most favourable setup on record.',
  };
  if (expensive && hostile) return {
    title: 'Stretched valuation into a hostile backdrop',
    body:  'Cycle signals are elevated at the same time as macro conditions are tightening. Historically the least forgiving combination — valuation offers no cushion if the macro shock arrives.',
  };
  if (expensive && friendly) return {
    title: 'Stretched valuation, but macro is still supportive',
    body:  'Cycle signals are elevated while liquidity and credit remain supportive. Trends can extend a long way in this regime, which is precisely what makes it dangerous to extrapolate.',
  };
  return {
    title: 'Mixed — neither score is decisive',
    body:  'Neither the cycle position nor the macro backdrop is at an extreme. In this regime the two scores are best read as context rather than as a signal, and position sizing matters more than direction.',
  };
}

function ScoreBlock({ label, score, sub, color, scaleNote }: {
  label: string; score: number | null; sub: string; color: string; scaleNote: string;
}) {
  return (
    <div className="flex-1 min-w-[180px]">
      <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>
        {label}
      </p>
      <p className="text-4xl font-mono font-bold mt-1" style={{ color }}>
        {score ?? '—'}
        <span className="text-base font-normal" style={{ color: 'var(--sct-muted)' }}>/100</span>
      </p>
      <p className="text-xs font-semibold mt-0.5" style={{ color }}>{sub}</p>
      <div className="h-1 rounded-full overflow-hidden mt-2" style={{ backgroundColor: 'var(--sct-border)' }}>
        {score != null && (
          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
        )}
      </div>
      <p className="text-[10px] mt-1.5" style={{ color: 'var(--sct-muted)' }}>{scaleNote}</p>
    </div>
  );
}

export function CycleVsMacroBridge({ macroScore, macroBand, macroColor }: Props) {
  const { data, loading, error } = useApiData<CycleScoreResult>('/api/cycle');

  const cycleScore = data?.score ?? null;
  const combination = cycleScore != null && macroScore != null
    ? readCombination(cycleScore, macroScore)
    : null;

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
        Cycle Score × Macro Risk
      </p>
      <p className="text-xs mt-0.5 mb-5" style={{ color: 'var(--sct-muted)' }}>
        Where Bitcoin sits in its own cycle, read against what the rest of the world is doing.
      </p>

      <div className="flex flex-wrap gap-6">
        <ScoreBlock
          label="Skyline Cycle Score"
          score={cycleScore}
          sub={loading ? 'Loading…' : error ? 'Unavailable' : data?.zoneLabel ?? '—'}
          color={data?.zoneColor ?? 'var(--sct-secondary)'}
          scaleNote="Low = historically cheap · High = distribution risk"
        />
        <ScoreBlock
          label="Macro Risk Score"
          score={macroScore}
          sub={macroBand}
          color={macroColor}
          scaleNote="Low = macro supportive · High = macro hostile"
        />
      </div>

      {combination && (
        <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--sct-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>{combination.title}</p>
          <p className="text-xs leading-relaxed mt-1.5" style={{ color: 'var(--sct-secondary)' }}>
            {combination.body}
          </p>
        </div>
      )}

      {error && (
        <p className="text-[11px] font-mono mt-4" style={{ color: 'var(--sct-muted)' }}>
          Cycle Score could not be loaded — the Macro Risk Score above is unaffected.
        </p>
      )}
    </div>
  );
}
