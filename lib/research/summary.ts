import type { DeepResearchReport } from '@/lib/research/report';

// The landing-page preview used to build its own ledger from the cycle score
// alone (11 indicators). The report builds it from four groups — cycle score,
// valuation, macro and timing (19 indicators) — so the two surfaces computed
// different weighted extensions and could name different regimes on the same
// day. The preview now reads this projection of the real report instead, which
// makes divergence impossible rather than merely unlikely.

export type SummaryRow = {
  id:      string;
  label:   string;
  reading: string;
};

export type ResearchSummary = {
  asOfDate:          string;
  cycleScore:        number;
  zoneLabel:         string;
  zoneColor:         string;
  thesisLabel:       string;
  weightedExtension: number;
  indicatorsRead:    number;
  supportingCount:   number;
  weakeningCount:    number;
  gapCount:          number;
  supporting:        SummaryRow[];   // already ranked by the report
  weakening:         SummaryRow[];
};

const PREVIEW_ROWS = 4;

const row = (i: { id: string; label: string; reading: string }): SummaryRow => ({
  id: i.id, label: i.label, reading: i.reading,
});

export function toResearchSummary(r: DeepResearchReport): ResearchSummary {
  return {
    asOfDate:          r.asOfDate,
    cycleScore:        r.cycleScore,
    zoneLabel:         r.zoneLabel,
    zoneColor:         r.zoneColor,
    thesisLabel:       r.thesisLabel,
    weightedExtension: r.ledger.weightedExtension,
    indicatorsRead:    r.ledger.available.length,
    supportingCount:   r.supporting.length,
    weakeningCount:    r.weakening.length,
    gapCount:          r.ledger.gaps.length,
    supporting:        r.supporting.slice(0, PREVIEW_ROWS).map(row),
    weakening:         r.weakening.slice(0, PREVIEW_ROWS).map(row),
  };
}
