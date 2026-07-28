import { StatCard } from '@/components/dashboard/StatCard';
import type { CycleWindow, CyclePhase } from '@/lib/cycles/durationModel';
import { fmtDate } from '@/lib/cycles/durationModel';

const PHASE_LABEL: Record<CyclePhase, string> = {
  expansion: 'Expansion',
  'peak-risk': 'Peak Risk Window',
  distribution: 'Distribution / Bear',
  accumulation: 'Bottom Formation',
  'beyond-model': 'Beyond Model Range',
};

const PHASE_COLOR: Record<CyclePhase, string> = {
  expansion: '#35D07F',
  'peak-risk': '#E6B450',
  distribution: '#FF5C5C',
  accumulation: '#5B84FF',
  'beyond-model': 'var(--sct-muted)',
};

type Props = {
  currentPrice: number | null;
  phase: CyclePhase;
  daysSinceLow: number;
  cycles: CycleWindow[];
  confidenceScore: number;
  confidenceLabel: 'Low' | 'Moderate' | 'High';
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const CONFIDENCE_COLOR: Record<Props['confidenceLabel'], string> = {
  Low: '#FF5C5C',
  Moderate: '#E6B450',
  High: '#35D07F',
};

export function CycleSummaryCards({ currentPrice, phase, daysSinceLow, cycles, confidenceScore, confidenceLabel }: Props) {
  const current = cycles.find((c) => c.status === 'in-progress');
  const nextCycle = cycles.find((c) => c.status === 'projected');

  const daysToModeledLow = current ? Math.max(0, -(daysSinceLow - (current.bullDays + current.bearDays))) : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        label="Current BTC"
        value={currentPrice != null ? `$${fmt(currentPrice)}` : '—'}
        accent="var(--sct-text)"
        freshness="daily"
      />
      <StatCard
        label="Current Model Phase"
        value={PHASE_LABEL[phase]}
        sub={`Day ${fmt(daysSinceLow)} of cycle`}
        accent={PHASE_COLOR[phase]}
        freshness="daily"
      />
      <StatCard
        label="Modeled Cycle Low"
        value={current ? fmtDate(current.projectedLowDate) : '—'}
        sub={daysToModeledLow != null ? `${fmt(daysToModeledLow)} days away` : undefined}
        accent="#5B84FF"
        freshness="daily"
      />
      <StatCard
        label="Next Expansion Window"
        value={current ? `${fmt(current.bullDays)} days` : '—'}
        sub="1,064-day bull model"
        accent="#35D07F"
        freshness="daily"
      />
      <StatCard
        label="Modeled Cycle Peak"
        value={nextCycle ? fmtDate(nextCycle.projectedHighDate) : '—'}
        sub="Following expansion window"
        accent="#E6B450"
        freshness="daily"
      />
      <StatCard
        label="Model Confidence"
        value={confidenceLabel}
        sub={`${confidenceScore} / 100`}
        accent={CONFIDENCE_COLOR[confidenceLabel]}
        freshness="daily"
      />
    </div>
  );
}
