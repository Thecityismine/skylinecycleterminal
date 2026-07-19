export function RiskDisclosure() {
  return (
    <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-red)' }}>
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-red)' }}>Risk Disclosure</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
        Liquidation thresholds, interest calculations, fees, and collateral procedures vary by lender. Some lenders
        may liquidate before the stated threshold, charge additional fees, or require collateral to be topped up
        within a short period. Confirm all terms directly with the lender before borrowing.
      </p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
        Bitcoin-backed loans can create a taxable event if collateral is liquidated. Consult a qualified tax
        professional regarding your jurisdiction.
      </p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
        This is an educational modeling tool, not financial advice. It does not represent an offer of credit from
        any lender.
      </p>
    </div>
  );
}
