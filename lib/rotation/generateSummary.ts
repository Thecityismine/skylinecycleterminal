import { PHASE_LABEL } from '@/lib/indicators/marketRotation';
import type { RegimeBand, CycleSegment, SimilarityMatch } from '@/lib/indicators/marketRotation';
import type { DerivedStats } from './deriveTabStats';

export function generateRotationSummary(
  ticker:      string,
  stats:       DerivedStats,
  ma:          number,
  regime:      RegimeBand,
  latestPhase: CycleSegment | undefined,
  similarity:  SimilarityMatch[],
): string {
  const structureText = stats.aboveMA
    ? `holding above its ${ma}W EMA`
    : stats.aboveMA === false
      ? `trading below its ${ma}W EMA`
      : `lacking enough history for a ${ma}W EMA read`;

  const momentumText = stats.momentumLabel === 'Rising'
    ? 'while momentum is improving'
    : stats.momentumLabel === 'Falling'
      ? 'while momentum is fading'
      : 'while momentum is flat';

  const phaseText = latestPhase ? `The current cycle phase is ${PHASE_LABEL[latestPhase.phase]}.` : '';

  const historyText = similarity.length
    ? `Historically this combination has most resembled ${similarity[0].startTime}–${similarity[0].endTime}, which was followed by a ${similarity[0].forwardReturnPct >= 0 ? '+' : ''}${similarity[0].forwardReturnPct}% move.`
    : '';

  return `${ticker} is in a ${regime.label.toLowerCase()} structure, ${structureText}, ${momentumText}. ${phaseText} ${historyText}`
    .replace(/\s+/g, ' ')
    .trim();
}
