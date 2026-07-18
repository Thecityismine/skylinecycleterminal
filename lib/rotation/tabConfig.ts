import type { RotationSeriesPoint } from '@/lib/api/marketRotation';
import { BULLISH_NEUTRAL_BEARISH, WEAK_NEUTRAL_STRONG_EXPLOSIVE } from '@/lib/indicators/marketRotation';
import type { RegimeBand } from '@/lib/indicators/marketRotation';

export type RotationTabKey =
  | 'total'
  | 'total2'
  | 'total3'
  | 'largeCaps'
  | 'altBtcStrength'
  | 'speculativeAlts'
  | 'dominanceRotation';

export type OverlayKey = 'cloud' | 'trend' | 'swing' | 'choch' | 'momentum' | 'wave' | 'macro';

export type RotationTabConfig = {
  key:           RotationTabKey;
  ticker:        string;
  navLabel:      string;
  title:         string;
  description:   string;
  maReason:      string;
  defaultMA:     50 | 100 | 200;
  defaultRange:  '2Y' | '4Y' | '8Y' | 'All';
  metrics:       string[];
  insights:      string[];
  regimeTable:   RegimeBand[];
  overlays:      OverlayKey[];
  getValue:      (p: RotationSeriesPoint) => number;
  isRatio:       boolean; // ratio series (e.g. TOTAL3/BTC) format as decimal, not $
  shareSubtitle: string;
  color:         string;
};

export const ROTATION_TABS: RotationTabConfig[] = [
  {
    key:          'total',
    ticker:       'TOTAL',
    navLabel:     'Total Market',
    title:        'TOTAL Crypto Market',
    description:  'Total value of every cryptocurrency combined.',
    maReason:     'Institutional trend.',
    defaultMA:    200,
    defaultRange: '4Y',
    metrics:      ['Current Market Cap', 'Distance from ATH', 'Cycle Position', 'Bull/Bear Status', '200W EMA Distance', 'Cycle Score'],
    insights:     ['Current Trend', 'Above 200W EMA', 'Weekly Momentum', 'Cycle Phase', 'Current Risk', 'Historical Similarity'],
    regimeTable:  BULLISH_NEUTRAL_BEARISH,
    overlays:     ['cloud', 'trend', 'swing', 'choch', 'momentum', 'wave', 'macro'],
    getValue:     (p) => p.total,
    isRatio:      false,
    shareSubtitle: 'BTC Total Market',
    color:        '#F5F7FA',
  },
  {
    key:          'total2',
    ticker:       'TOTAL2',
    navLabel:     'Ex-BTC (TOTAL2)',
    title:        'TOTAL2',
    description:  'Crypto market excluding Bitcoin.',
    maReason:     'Broad ex-BTC trend.',
    defaultMA:    200,
    defaultRange: '4Y',
    metrics:      ['Distance from ATH', 'Accumulation Score', 'Expansion Score', 'Market Structure', 'Rotation Score'],
    insights:     ['Current Trend', 'Above 200W EMA', 'Weekly Momentum', 'Cycle Phase', 'Current Risk', 'Historical Similarity'],
    regimeTable:  BULLISH_NEUTRAL_BEARISH,
    overlays:     ['cloud', 'trend', 'swing', 'momentum'],
    getValue:     (p) => p.total2,
    isRatio:      false,
    shareSubtitle: 'Ethereum, Large Caps & Altcoins',
    color:        '#7C8CFF',
  },
  {
    key:          'total3',
    ticker:       'TOTAL3',
    navLabel:     'Altcoins (TOTAL3)',
    title:        'TOTAL3',
    description:  'Crypto market excluding Bitcoin and Ethereum.',
    maReason:     'Alts trend faster than BTC.',
    defaultMA:    100,
    defaultRange: '4Y',
    metrics:      ['Altcoin Momentum', 'Breakout Status', 'Historical Expansion %', 'Risk Score', 'Cycle Position'],
    insights:     ['Current Trend', 'Above 100W EMA', 'Weekly Momentum', 'Cycle Phase', 'Current Risk', 'Historical Similarity'],
    regimeTable:  BULLISH_NEUTRAL_BEARISH,
    overlays:     ['cloud', 'trend', 'swing', 'momentum'],
    getValue:     (p) => p.total3,
    isRatio:      false,
    shareSubtitle: 'Pure altcoin market',
    color:        '#35D07F',
  },
  {
    key:          'largeCaps',
    ticker:       'TOTAL2 - ETH',
    navLabel:     'Large Caps',
    title:        'TOTAL2 minus ETH',
    description:  'Large-cap altcoins excluding Bitcoin and Ethereum.',
    maReason:     'Smooths large-cap chop.',
    defaultMA:    100,
    defaultRange: '4Y',
    metrics:      ['Large Cap Strength', 'Institutional Rotation', 'ETH Leadership', 'Large Cap Relative Strength'],
    insights:     ['Current Trend', 'Above 100W EMA', 'Weekly Momentum', 'Cycle Phase', 'Current Risk', 'Historical Similarity'],
    regimeTable:  BULLISH_NEUTRAL_BEARISH,
    overlays:     ['cloud', 'trend', 'momentum'],
    getValue:     (p) => p.total3, // TOTAL2 - ETH is mathematically TOTAL3 (TOTAL - BTC - ETH)
    isRatio:      false,
    shareSubtitle: 'Large-cap altcoins ex BTC/ETH',
    color:        '#E6B450',
  },
  {
    key:          'altBtcStrength',
    ticker:       'TOTAL3 / BTC',
    navLabel:     'Alt/BTC Strength',
    title:        'TOTAL3 / BTC',
    description:  'Measures whether altcoins are outperforming Bitcoin.',
    maReason:     'Fast rotation signal.',
    defaultMA:    50,
    defaultRange: '4Y',
    metrics:      ['Alt Strength', 'Rotation Stage', 'Altseason Probability', 'BTC Leadership', 'Trend Strength'],
    insights:     ['Current Trend', 'Above 50W EMA', 'Weekly Momentum', 'Cycle Phase', 'Current Risk', 'Historical Similarity'],
    regimeTable:  WEAK_NEUTRAL_STRONG_EXPLOSIVE,
    overlays:     ['trend', 'swing', 'choch', 'momentum'],
    getValue:     (p) => p.total3OverBtc,
    isRatio:      true,
    shareSubtitle: 'Altcoins vs Bitcoin',
    color:        '#45F3FF',
  },
  {
    key:          'speculativeAlts',
    ticker:       'OTHERS / BTC',
    navLabel:     'Speculative Alts',
    title:        'OTHERS / BTC',
    description:  'Performance of smaller-cap altcoins versus Bitcoin.',
    maReason:     'Speculative flow signal.',
    defaultMA:    50,
    defaultRange: '4Y',
    metrics:      ['Risk Appetite', 'Speculation Index', 'Retail Activity', 'Momentum', 'Alt Beta'],
    insights:     ['Current Trend', 'Above 50W EMA', 'Weekly Momentum', 'Cycle Phase', 'Current Risk', 'Historical Similarity'],
    regimeTable:  WEAK_NEUTRAL_STRONG_EXPLOSIVE,
    overlays:     ['trend', 'swing', 'momentum'],
    getValue:     (p) => p.othersOverBtc,
    isRatio:      true,
    shareSubtitle: 'Small caps vs Bitcoin',
    color:        '#FF5CA8',
  },
  {
    key:          'dominanceRotation',
    ticker:       'OTHERS.D / BTC.D',
    navLabel:     'Dominance Rotation',
    title:        'OTHERS.D / BTC.D',
    description:  'Measures dominance shift between speculative altcoins and Bitcoin.',
    maReason:     'Dominance rotation signal.',
    defaultMA:    50,
    defaultRange: '4Y',
    metrics:      ['Dominance Trend', 'Alt Rotation', 'BTC Rotation', 'Risk On', 'Risk Off'],
    insights:     ['Current Trend', 'Above 50W EMA', 'Weekly Momentum', 'Cycle Phase', 'Current Risk', 'Historical Similarity'],
    regimeTable:  WEAK_NEUTRAL_STRONG_EXPLOSIVE,
    overlays:     ['trend', 'swing', 'momentum'],
    // OTHERS.D / BTC.D as a literal ratio cancels to exactly OTHERS/BTC (both
    // dominance terms divide out the same TOTAL) — mathematically identical to
    // the Speculative Alts tab. The dominance *spread* (percentage-point gap
    // between the two dominance lines) is the distinct, meaningful rotation
    // signal this tab is actually meant to show.
    getValue:     (p) => p.othersDominance - p.btcDominance,
    isRatio:      true,
    shareSubtitle: 'Altcoin vs Bitcoin dominance spread',
    color:        '#8B5CF6',
  },
];

export function getTabConfig(key: string): RotationTabConfig {
  return ROTATION_TABS.find((t) => t.key === key) ?? ROTATION_TABS[0];
}
