"use client";

import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type LoanShareData = {
  loanAmount:        number;
  targetLtvPct:      number;
  btcCollateral:     number;
  entryPrice:        number;
  marginCallPrice:   number;
  liquidationPrice:  number;
  riskLabel:         string;
  riskColor:         string;
  generatedAt:       string;
};

export type LoanSharePrivacy = {
  hideLoanAmount:  boolean;
  hideCollateral:  boolean;
  percentagesOnly: boolean;
};

export type LoanSharePayload = LoanShareData & LoanSharePrivacy;

function fmtUsd(v: number): string {
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

const HIDDEN = '••••••';

export function LoanShareCard({ payload }: { payload: LoanSharePayload }) {
  const {
    loanAmount, targetLtvPct, btcCollateral, entryPrice, marginCallPrice, liquidationPrice,
    riskLabel, riskColor, generatedAt, hideLoanAmount, hideCollateral, percentagesOnly,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const rows: { label: string; value: string; color?: string }[] = [
    { label: 'Loan Amount',       value: percentagesOnly || hideLoanAmount ? HIDDEN : fmtUsd(loanAmount) },
    { label: 'Starting LTV',      value: `${targetLtvPct.toFixed(1)}%` },
    { label: 'Collateral',        value: percentagesOnly || hideCollateral ? HIDDEN : `${btcCollateral.toFixed(4)} BTC` },
    { label: 'Entry Price',       value: fmtUsd(entryPrice) },
    { label: 'Margin Call',       value: fmtUsd(marginCallPrice) },
    { label: 'Liquidation Price', value: fmtUsd(liquidationPrice) },
    { label: 'Risk Rating',       value: riskLabel.toUpperCase(), color: riskColor },
  ];

  return (
    <div style={{
      width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, backgroundColor: '#0D1117',
      position: 'relative', overflow: 'hidden', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      display: 'flex', flexDirection: 'column', padding: 40, boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: '#8B949E', margin: 0, letterSpacing: '0.08em' }}>SKYLINE</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#F7F9FC', margin: '4px 0 0' }}>BTC Loan Calculator</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 0' }}>{dateStr}</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, maxWidth: 620 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #21262D', paddingBottom: 10 }}>
            <span style={{ fontSize: 15, color: '#8B949E' }}>{r.label}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: r.color ?? '#F7F9FC' }}>{r.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#6B7280' }}>Educational model, not financial advice</span>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>Skyline Cycle Terminal</span>
      </div>
    </div>
  );
}
