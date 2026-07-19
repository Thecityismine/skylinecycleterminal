"use client";

import { useState, useMemo, useCallback } from 'react';
import { ImageDown } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { LoanInputPanel } from './LoanInputPanel';
import { LoanSummaryCards } from './LoanSummaryCards';
import { LoanRiskGauge } from './LoanRiskGauge';
import { PriceStressTable } from './PriceStressTable';
import { LtvPriceCurve } from './LtvPriceCurve';
import { BorrowingCostPanel } from './BorrowingCostPanel';
import { CollateralActionsPanel } from './CollateralActionsPanel';
import { EmergencyReservePlanner } from './EmergencyReservePlanner';
import { ReverseCalculator } from './ReverseCalculator';
import { HistoricalDrawdownContext } from './HistoricalDrawdownContext';
import { RiskDisclosure } from './RiskDisclosure';
import { LoanShareModal } from '@/components/share/LoanShareModal';
import { DEFAULT_LOAN_INPUTS } from '@/lib/loans/types';
import type { LoanInputs } from '@/lib/loans/types';
import { resolveInputs } from '@/lib/loans/resolveInputs';
import { calculateLoanScenario } from '@/lib/loans/loanScenario';
import { buildLtvZones, getLoanRiskBand } from '@/lib/loans/riskScore';
import { buildPriceStressRows, defaultStressPrices, buildLtvCurvePoints } from '@/lib/loans/stressTest';
import { findHistoricalDrawdownsExceeding } from '@/lib/loans/historicalDrawdowns';
import type { PricePoint } from '@/lib/api/coinmetrics';

type Props = {
  livePrice:        number | null;
  historicalPrices: PricePoint[];
};

export function BtcLoanCalculatorPageClient({ livePrice, historicalPrices }: Props) {
  const seedPrice = livePrice ?? DEFAULT_LOAN_INPUTS.currentBtcPrice;

  const [inputs, setInputs] = useState<LoanInputs>(() => ({
    ...DEFAULT_LOAN_INPUTS,
    btcEntryPrice:   seedPrice,
    currentBtcPrice: seedPrice,
  }));
  const [customStressPrices, setCustomStressPrices] = useState<number[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleInputChange = useCallback((patch: Partial<LoanInputs>) => {
    setInputs((prev) => {
      if (patch.mode !== undefined && patch.mode !== prev.mode) {
        const resolved = resolveInputs(prev);
        return { ...prev, ...resolved, ...patch };
      }
      return { ...prev, ...patch };
    });
  }, []);

  const displayInputs: LoanInputs = useMemo(() => ({ ...inputs, ...resolveInputs(inputs) }), [inputs]);

  const calc = useMemo(() => {
    try {
      return calculateLoanScenario({
        btcEntryPrice:      displayInputs.btcEntryPrice,
        currentBtcPrice:    displayInputs.currentBtcPrice,
        btcCollateral:      displayInputs.btcCollateral,
        principal:          displayInputs.loanAmount,
        outstandingBalance: displayInputs.loanAmount,
        annualInterestRate: displayInputs.annualInterestRatePct / 100,
        termMonths:         displayInputs.termMonths,
        originationFeePct:  displayInputs.originationFeePct / 100,
        targetLtv:          displayInputs.targetLtvPct / 100,
        marginCallLtv:      displayInputs.marginCallLtvPct / 100,
        liquidationLtv:     displayInputs.liquidationLtvPct / 100,
        emergencyCashReserve: displayInputs.emergencyCashReserve,
      });
    } catch {
      return null;
    }
  }, [displayInputs]);

  const ltvZones = useMemo(
    () => buildLtvZones(displayInputs.marginCallLtvPct / 100, displayInputs.liquidationLtvPct / 100),
    [displayInputs.marginCallLtvPct, displayInputs.liquidationLtvPct],
  );

  const stressPrices = useMemo(() => {
    if (!calc) return [];
    const defaults = defaultStressPrices(displayInputs.btcEntryPrice, calc.liquidationPrice);
    return Array.from(new Set([...defaults, ...customStressPrices, Math.round(calc.marginCallPrice), Math.round(calc.liquidationPrice)]));
  }, [calc, displayInputs.btcEntryPrice, customStressPrices]);

  const stressRows = useMemo(
    () => (calc ? buildPriceStressRows(stressPrices, displayInputs.loanAmount, displayInputs.btcCollateral, ltvZones) : []),
    [calc, stressPrices, displayInputs.loanAmount, displayInputs.btcCollateral, ltvZones],
  );

  const curvePoints = useMemo(() => {
    if (!calc) return [];
    const min = Math.max(0, calc.liquidationPrice * 0.75);
    const max = displayInputs.btcEntryPrice * 1.2;
    return buildLtvCurvePoints(displayInputs.loanAmount, displayInputs.btcCollateral, min, max);
  }, [calc, displayInputs.loanAmount, displayInputs.btcCollateral, displayInputs.btcEntryPrice]);

  const drawdownEpisodes = useMemo(() => {
    if (!calc || !historicalPrices.length) return [];
    return findHistoricalDrawdownsExceeding(historicalPrices, Math.abs(calc.declineToLiquidationPct));
  }, [calc, historicalPrices]);

  const riskBand = calc ? getLoanRiskBand(calc.riskScore) : null;

  return (
    <>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title="BTC Loan Risk Calculator"
            subtitle="Model collateral requirements, LTV changes, margin calls, liquidation risk, and borrowing costs before pledging Bitcoin."
          />
          <button
            onClick={() => setShowShareModal(true)}
            disabled={!calc}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{ backgroundColor: 'transparent', borderColor: 'var(--sct-border)', color: 'var(--sct-muted)', opacity: calc ? 1 : 0.4 }}
          >
            <ImageDown size={13} />
            Share Scenario
          </button>
        </div>

        {/* Always rendered so the inputs are never stranded behind a blank/error state */}
        <LoanInputPanel inputs={displayInputs} onChange={handleInputChange} />

        {!calc || !riskBand ? (
          <div className="rounded-xl border p-6 text-sm" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}>
            Enter a BTC price and collateral amount above zero to see results.
          </div>
        ) : (
          <>
            <div className="rounded-xl border p-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-center" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
              <div className="flex justify-center">
                <LoanRiskGauge score={calc.riskScore} label={riskBand.label} color={riskBand.color} size={240} />
              </div>
              <LoanSummaryCards calc={calc} />
            </div>

            <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>LTV Curve</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                  How fast risk accelerates as BTC price falls. The curve rises as BTC falls.
                </p>
              </div>
              <LtvPriceCurve
                points={curvePoints}
                targetLtv={displayInputs.targetLtvPct / 100}
                marginCallLtv={displayInputs.marginCallLtvPct / 100}
                liquidationLtv={displayInputs.liquidationLtvPct / 100}
                markers={[
                  { price: displayInputs.btcEntryPrice, label: 'Entry', color: '#8B949E' },
                  { price: displayInputs.currentBtcPrice, label: 'Current', color: '#F7931A' },
                  { price: calc.marginCallPrice, label: 'Margin Call', color: '#F7931A' },
                  { price: calc.liquidationPrice, label: 'Liquidation', color: '#F85149' },
                ]}
              />
            </div>

            <PriceStressTable rows={stressRows} onAddPrice={(p) => setCustomStressPrices((prev) => Array.from(new Set([...prev, Math.round(p)])))} />

            <div className="rounded-xl border p-5 space-y-2" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>Interest-Adjusted Liquidation Price</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Today</p>
                  <p className="text-xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
                    ${Math.round(calc.liquidationPrice).toLocaleString('en-US')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
                    Estimated after {displayInputs.termMonths} months
                  </p>
                  <p className="text-xl font-mono font-bold" style={{ color: 'var(--sct-red)' }}>
                    ${Math.round(calc.futureLiquidationPrice).toLocaleString('en-US')}
                  </p>
                </div>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>
                Assumes simple interest and fees accrue onto the balance. The exact calculation varies by lender.
              </p>
            </div>

            <CollateralActionsPanel
              loanBalance={displayInputs.loanAmount}
              btcCollateral={displayInputs.btcCollateral}
              currentBtcPrice={displayInputs.currentBtcPrice}
              collateralValue={calc.collateralValue}
              defaultTargetLtvPct={displayInputs.targetLtvPct}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <EmergencyReservePlanner
                loanBalance={displayInputs.loanAmount}
                btcCollateral={displayInputs.btcCollateral}
                targetLtvPct={displayInputs.targetLtvPct}
                emergencyCashReserve={displayInputs.emergencyCashReserve}
                onChangeReserve={(v) => handleInputChange({ emergencyCashReserve: v })}
                suggestedStressPrice={calc.marginCallPrice}
              />
              <ReverseCalculator
                btcCollateral={displayInputs.btcCollateral}
                liquidationLtvPct={displayInputs.liquidationLtvPct}
                defaultDesiredPrice={calc.liquidationPrice}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <BorrowingCostPanel inputs={displayInputs} calc={calc} />
              <HistoricalDrawdownContext
                entryPrice={displayInputs.btcEntryPrice}
                liquidationPrice={calc.liquidationPrice}
                declinePct={calc.declineToLiquidationPct}
                episodes={drawdownEpisodes}
              />
            </div>
          </>
        )}

        <RiskDisclosure />
      </div>

      {showShareModal && calc && riskBand && (
        <LoanShareModal
          data={{
            loanAmount:       displayInputs.loanAmount,
            targetLtvPct:     displayInputs.targetLtvPct,
            btcCollateral:    displayInputs.btcCollateral,
            entryPrice:       displayInputs.btcEntryPrice,
            marginCallPrice:  calc.marginCallPrice,
            liquidationPrice: calc.liquidationPrice,
            riskLabel:        riskBand.label.replace(' Risk', ''),
            riskColor:        riskBand.color,
            generatedAt:      new Date().toISOString(),
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
