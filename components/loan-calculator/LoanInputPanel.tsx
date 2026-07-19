"use client";

import type { LoanInputs, LoanInputMode } from '@/lib/loans/types';
import { LTV_PRESETS } from '@/lib/loans/types';

const MODES: { key: LoanInputMode; label: string }[] = [
  { key: 'loanAmount',   label: 'Loan Amount' },
  { key: 'btcCollateral', label: 'BTC Collateral' },
  { key: 'targetLtv',    label: 'Target LTV' },
];

function fmtBtc(v: number): string {
  return `${v.toFixed(4)} BTC`;
}

function NumberField({
  label, value, onChange, readOnly, prefix, suffix, step, computedHint,
}: {
  label:        string;
  value:        number;
  onChange?:    (v: number) => void;
  readOnly?:    boolean;
  prefix?:      string;
  suffix?:      string;
  step?:        number;
  computedHint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>{label}</span>
        {computedHint && (
          <span className="text-[10px] font-mono" style={{ color: 'var(--sct-blue)' }}>{computedHint}</span>
        )}
      </div>
      <div
        className="flex items-center rounded-md border px-3"
        style={{
          backgroundColor: readOnly ? 'var(--sct-panel)' : 'transparent',
          borderColor:     'var(--sct-border)',
          opacity:         readOnly ? 0.75 : 1,
        }}
      >
        {prefix && <span className="text-sm font-mono mr-1" style={{ color: 'var(--sct-muted)' }}>{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : ''}
          readOnly={readOnly}
          step={step ?? 'any'}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="w-full bg-transparent py-2 text-sm font-mono outline-none"
          style={{ color: 'var(--sct-text)' }}
        />
        {suffix && <span className="text-sm font-mono ml-1" style={{ color: 'var(--sct-muted)' }}>{suffix}</span>}
      </div>
    </div>
  );
}

type Props = {
  inputs:  LoanInputs;
  onChange: (patch: Partial<LoanInputs>) => void;
};

export function LoanInputPanel({ inputs, onChange }: Props) {
  const activePreset = LTV_PRESETS.find((p) => p.targetLtvPct === inputs.targetLtvPct);

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>Loan Inputs</p>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => onChange({ mode: m.key })}
              className="px-3 py-1 rounded text-xs font-mono border transition-all"
              style={{
                backgroundColor: inputs.mode === m.key ? 'var(--sct-border)' : 'transparent',
                borderColor:     'var(--sct-border)',
                color:           inputs.mode === m.key ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NumberField label="BTC Entry Price" prefix="$" value={inputs.btcEntryPrice} onChange={(v) => onChange({ btcEntryPrice: v })} />
        <NumberField label="Current BTC Price" prefix="$" value={inputs.currentBtcPrice} onChange={(v) => onChange({ currentBtcPrice: v })} />

        <NumberField
          label="Loan Amount" prefix="$" value={inputs.loanAmount}
          readOnly={inputs.mode === 'btcCollateral'}
          onChange={(v) => onChange({ loanAmount: v })}
        />
        <NumberField
          label="BTC Collateral" suffix="BTC" step={0.001} value={inputs.btcCollateral}
          readOnly={inputs.mode === 'loanAmount'}
          onChange={(v) => onChange({ btcCollateral: v })}
        />
        <NumberField
          label="Target LTV" suffix="%" value={inputs.targetLtvPct}
          readOnly={inputs.mode === 'targetLtv'}
          onChange={(v) => onChange({ targetLtvPct: v })}
        />

        <NumberField label="Margin-Call LTV" suffix="%" value={inputs.marginCallLtvPct} onChange={(v) => onChange({ marginCallLtvPct: v })} />
        <NumberField label="Liquidation LTV" suffix="%" value={inputs.liquidationLtvPct} onChange={(v) => onChange({ liquidationLtvPct: v })} />
        <NumberField label="Interest Rate (APR)" suffix="%" value={inputs.annualInterestRatePct} onChange={(v) => onChange({ annualInterestRatePct: v })} />
        <NumberField label="Loan Term" suffix="months" value={inputs.termMonths} onChange={(v) => onChange({ termMonths: v })} />
        <NumberField label="Origination Fee" suffix="%" value={inputs.originationFeePct} onChange={(v) => onChange({ originationFeePct: v })} />
      </div>

      <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--sct-border)' }}>
        <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Scenario Presets</p>
        <div className="flex flex-wrap gap-1.5">
          {LTV_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => onChange({ mode: inputs.mode === 'targetLtv' ? 'loanAmount' : inputs.mode, targetLtvPct: p.targetLtvPct })}
              className="px-3 py-1 rounded text-xs font-mono border transition-all"
              style={{
                backgroundColor: activePreset?.label === p.label ? 'rgba(247,147,26,0.12)' : 'transparent',
                borderColor:     activePreset?.label === p.label ? '#F7931A' : 'var(--sct-border)',
                color:           activePreset?.label === p.label ? '#F7931A' : 'var(--sct-muted)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {activePreset?.warning && (
          <p className="text-xs" style={{ color: 'var(--sct-amber)' }}>{activePreset.warning}</p>
        )}
      </div>

      {inputs.mode !== 'btcCollateral' && (
        <p className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
          BTC collateral required: {fmtBtc(inputs.btcCollateral)}
        </p>
      )}
    </div>
  );
}
