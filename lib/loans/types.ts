export type LoanInputMode = 'loanAmount' | 'btcCollateral' | 'targetLtv';

// UI-facing input state. LTV/rate fields are stored as whole percentages
// (25 = 25%) here — lib/loans/* functions want decimals, converted at the
// point of calculation, matching "25% = 0.25" from the calculation layer.
export type LoanInputs = {
  mode:                  LoanInputMode;
  btcEntryPrice:         number;
  currentBtcPrice:       number;
  loanAmount:            number;
  btcCollateral:         number;
  targetLtvPct:          number;
  marginCallLtvPct:      number;
  liquidationLtvPct:     number;
  annualInterestRatePct: number;
  termMonths:            number;
  originationFeePct:     number;
  emergencyCashReserve:  number;
};

export const DEFAULT_LOAN_INPUTS: LoanInputs = {
  mode:                  'targetLtv',
  btcEntryPrice:         50_000,
  currentBtcPrice:       50_000,
  loanAmount:            5_000,
  btcCollateral:         0.40,
  targetLtvPct:          25,
  marginCallLtvPct:      60,
  liquidationLtvPct:     70,
  annualInterestRatePct: 11,
  termMonths:            12,
  originationFeePct:     1,
  emergencyCashReserve:  0,
};

export const LTV_PRESETS: { label: string; targetLtvPct: number; warning?: string }[] = [
  { label: 'Conservative 20%', targetLtvPct: 20 },
  { label: 'Balanced 25%',     targetLtvPct: 25 },
  { label: 'Moderate 30%',     targetLtvPct: 30 },
  { label: 'Aggressive 40%',   targetLtvPct: 40, warning: 'A 40% starting LTV leaves less room for normal Bitcoin volatility.' },
  { label: 'Maximum 50%',      targetLtvPct: 50, warning: 'A 50% starting LTV leaves limited room for normal Bitcoin volatility.' },
];
