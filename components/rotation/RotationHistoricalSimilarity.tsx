import { InsightPanel } from '@/components/dashboard/InsightPanel';
import type { SimilarityMatch } from '@/lib/indicators/marketRotation';

export function RotationHistoricalSimilarity({ matches }: { matches: SimilarityMatch[] }) {
  return (
    <InsightPanel title="Similar Periods">
      {matches.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Not enough history yet to find a comparable period.</p>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <div
              key={m.startTime}
              className="flex items-center justify-between pb-2.5 border-b last:border-0 last:pb-0"
              style={{ borderColor: 'var(--sct-border)' }}
            >
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--sct-text)' }}>{m.startTime} – {m.endTime}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>Similarity {m.similarity}%</p>
              </div>
              <span
                className="text-sm font-mono font-bold"
                style={{ color: m.forwardReturnPct >= 0 ? 'var(--sct-green)' : 'var(--sct-red)' }}
              >
                {m.forwardReturnPct >= 0 ? '+' : ''}{m.forwardReturnPct}%
              </span>
            </div>
          ))}
        </div>
      )}
    </InsightPanel>
  );
}
