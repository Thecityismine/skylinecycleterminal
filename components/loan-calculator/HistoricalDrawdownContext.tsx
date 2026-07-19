import { InsightPanel } from '@/components/dashboard/InsightPanel';
import type { DrawdownEpisode } from '@/lib/loans/historicalDrawdowns';

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

type Props = {
  entryPrice:       number;
  liquidationPrice: number;
  declinePct:       number;
  episodes:         DrawdownEpisode[];
};

export function HistoricalDrawdownContext({ entryPrice, liquidationPrice, declinePct, episodes }: Props) {
  return (
    <InsightPanel title="Historical Drawdown Context">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Entry BTC Price</p>
          <p className="text-sm font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>{fmtUsd(entryPrice)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Liquidation Price</p>
          <p className="text-sm font-mono font-semibold" style={{ color: 'var(--sct-red)' }}>{fmtUsd(liquidationPrice)}</p>
        </div>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--sct-secondary)' }}>
        Required decline: <span className="font-mono font-semibold" style={{ color: 'var(--sct-red)' }}>{declinePct.toFixed(1)}%</span>
      </p>

      {episodes.length > 0 ? (
        <>
          <p className="text-xs mb-2" style={{ color: 'var(--sct-muted)' }}>
            Bitcoin has declined at least this much from a prior all-time high during:
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {episodes.map((ev) => (
              <span key={ev.label} className="px-2.5 py-1 rounded-full text-xs border" style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-secondary)' }}>
                {ev.label}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs mb-3" style={{ color: 'var(--sct-muted)' }}>
          BTC has not historically declined this far from a prior all-time high — this would be an unprecedented move.
        </p>
      )}

      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
        Bitcoin has experienced declines of this magnitude in prior cycles. A large cushion does not eliminate liquidation risk.
      </p>
    </InsightPanel>
  );
}
