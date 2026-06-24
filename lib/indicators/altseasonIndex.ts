// ── Types ──────────────────────────────────────────────────────────────────

export type AltseasonRegime =
  | 'bitcoin_dominance'
  | 'bitcoin_season'
  | 'rotation_watch'
  | 'early_altseason'
  | 'broad_altseason';

export type AltseasonRegimeInfo = {
  key:         AltseasonRegime;
  label:       string;
  shortLabel:  string;
  range:       [number, number];
  color:       string;
  fill:        string;
  description: string;
  posture:     string;
};

export const REGIMES: AltseasonRegimeInfo[] = [
  {
    key:         'bitcoin_dominance',
    label:       'Bitcoin Dominance',
    shortLabel:  'BTC Dominant',
    range:       [0, 25],
    color:       '#FF3B5C',
    fill:        'rgba(255,59,92,0.10)',
    description: 'Bitcoin strongly leads. Most altcoins are underperforming significantly. Capital is concentrated in BTC. Defensive positioning in alts is warranted.',
    posture:     'Stay in BTC or stables. Avoid altcoin exposure.',
  },
  {
    key:         'bitcoin_season',
    label:       'Bitcoin Season',
    shortLabel:  'BTC Season',
    range:       [25, 50],
    color:       '#E6823A',
    fill:        'rgba(230,130,58,0.08)',
    description: 'Bitcoin is the preferred asset. Altcoin breadth is weak. ETH/BTC is not confirming rotation. Selective large-cap alt exposure may be acceptable.',
    posture:     'Lean BTC heavy. Watch ETH/BTC for early rotation signal.',
  },
  {
    key:         'rotation_watch',
    label:       'Rotation Watch',
    shortLabel:  'Rotation',
    range:       [50, 65],
    color:       '#E6B450',
    fill:        'rgba(230,180,80,0.08)',
    description: 'Early signs of capital rotating beyond Bitcoin. ETH and large-cap alts may be improving. Breadth not yet broad enough to confirm altseason.',
    posture:     'Monitor ETH/BTC and BTC.D trend. Begin watching large-cap alts.',
  },
  {
    key:         'early_altseason',
    label:       'Early Altseason',
    shortLabel:  'Early Alt',
    range:       [65, 80],
    color:       '#35D07F',
    fill:        'rgba(53,208,127,0.08)',
    description: 'Rotation is developing. BTC dominance is declining. A meaningful share of large-cap alts are outperforming BTC. Not yet confirmed broad altseason.',
    posture:     'Increase quality alt exposure. Manage risk. Watch for confirmation.',
  },
  {
    key:         'broad_altseason',
    label:       'Broad Altcoin Season',
    shortLabel:  'Altseason',
    range:       [80, 100],
    color:       '#45F3FF',
    fill:        'rgba(69,243,255,0.10)',
    description: 'Broad, sustained altcoin outperformance. The majority of tracked altcoins are beating Bitcoin. Capital is flowing broadly down the risk curve.',
    posture:     'Manage upside risk. Rebalance profits toward BTC / stables on extremes.',
  },
];

export function getRegime(score: number): AltseasonRegimeInfo {
  return REGIMES.find((r) => score >= r.range[0] && score < r.range[1]) ?? REGIMES[REGIMES.length - 1];
}

// ── Score inputs ────────────────────────────────────────────────────────────

export type AltseasonInputs = {
  altBreadthScore:       number; // 0–100: % of alts outperforming BTC 90d
  btcDominanceScore:     number; // 0–100: inverted BTC dominance signal
  ethBtcScore:           number; // 0–100: ETH/BTC strength
  total2Score:           number; // 0–100: TOTAL2 relative strength
  total3Score:           number; // 0–100: TOTAL3 relative strength
  stablecoinScore:       number; // 0–100: inverse stablecoin dominance
};

export function calculateAltseasonScore(inputs: AltseasonInputs): number {
  const raw =
    inputs.altBreadthScore  * 0.40 +
    inputs.btcDominanceScore * 0.20 +
    inputs.ethBtcScore       * 0.15 +
    inputs.total2Score       * 0.10 +
    inputs.total3Score       * 0.10 +
    inputs.stablecoinScore   * 0.05;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ── Sub-score helpers (all return 0–100) ────────────────────────────────────

// BTC dominance: lower BTC.D → higher score
// Typical range 35–65%
export function scoreBtcDominance(pct: number): number {
  return Math.max(0, Math.min(100, (65 - pct) / 30 * 100));
}

// ETH/BTC ratio: higher ratio → higher score
// Typical range 0.03 to 0.12
export function scoreEthBtc(ratio: number): number {
  return Math.max(0, Math.min(100, (ratio - 0.030) / 0.090 * 100));
}

// Altcoin breadth: direct % from 0–100
export function scoreAltBreadth(outperformingPct: number): number {
  return Math.max(0, Math.min(100, outperformingPct));
}

// TOTAL2 (totalMC - btcMC) growth vs BTC MC growth over 90d
// delta > 0 means alts growing faster than BTC
export function scoreTotal2Relative(total2Growth90d: number, btcGrowth90d: number): number {
  const diff = total2Growth90d - btcGrowth90d; // in percentage points
  // diff typically -40 to +40
  return Math.max(0, Math.min(100, (diff + 40) / 80 * 100));
}

// TOTAL3 (totalMC - btcMC - ethMC) growth vs BTC growth
export function scoreTotal3Relative(total3Growth90d: number, btcGrowth90d: number): number {
  const diff = total3Growth90d - btcGrowth90d;
  return Math.max(0, Math.min(100, (diff + 40) / 80 * 100));
}

// Stablecoin dominance: lower stablecoin share → higher score
// Typical range 4–16%
export function scoreStablecoinDominance(pct: number): number {
  return Math.max(0, Math.min(100, (16 - pct) / 12 * 100));
}

// ── Historical composite (simplified, uses only BTC/ETH MC + stablecoin) ───

export type HistoricalAltseasonPoint = {
  time:         string;
  ts:           number;
  score:        number;
  btcShare:     number; // BTC share of BTC+ETH combined cap
  ethBtcRatio:  number; // ETH MC / BTC MC
  stableDomPct: number; // stablecoin MC / (btcMC + ethMC)
};

export function buildHistoricalScore(
  btcMcHistory:    { time: string; mc: number }[],
  ethMcHistory:    { time: string; mc: number }[],
  stableHistory:   { time: string; stablecoinMC: number }[]
): HistoricalAltseasonPoint[] {
  const ethMap    = new Map(ethMcHistory.map((d) => [d.time, d.mc]));
  const stableMap = new Map(stableHistory.map((d) => [d.time, d.stablecoinMC]));

  return btcMcHistory
    .filter((d) => ethMap.has(d.time))
    .map((d) => {
      const ethMC   = ethMap.get(d.time)!;
      const combined = d.mc + ethMC;
      const stableMC = stableMap.get(d.time) ?? 0;

      const btcShare    = combined > 0 ? d.mc / combined : 0.6;
      const ethBtcRatio = d.mc > 0     ? ethMC / d.mc   : 0.05;
      const stableDomPct = combined > 0 ? (stableMC / combined) * 100 : 8;

      // BTC share → inverted: btcShare 0.35–0.75 maps to score 100–0
      const btcDomScore   = Math.max(0, Math.min(100, (0.75 - btcShare) / 0.40 * 100));
      const ethBtcScore   = scoreEthBtc(ethBtcRatio);
      const stableScore   = scoreStablecoinDominance(stableDomPct);

      const score = Math.round(
        btcDomScore * 0.55 +
        ethBtcScore * 0.30 +
        stableScore * 0.15
      );

      return {
        time:        d.time,
        ts:          new Date(d.time + 'T00:00:00Z').getTime(),
        score:       Math.max(0, Math.min(100, score)),
        btcShare:    +btcShare.toFixed(4),
        ethBtcRatio: +ethBtcRatio.toFixed(5),
        stableDomPct: +stableDomPct.toFixed(2),
      };
    })
    .sort((a, b) => a.ts - b.ts);
}

// ── Signal dots: detect meaningful regime crossings ─────────────────────────

export type SignalDot = {
  time:  string;
  ts:    number;
  score: number;
  type:  'early_rotation' | 'altseason_confirmed' | 'altseason_fading';
  label: string;
};

export function detectSignalDots(points: HistoricalAltseasonPoint[]): SignalDot[] {
  const dots: SignalDot[] = [];
  if (points.length < 2) return dots;

  const COOLDOWN_MS = 60 * 24 * 3600 * 1000; // 60 days between signals of same type
  const lastEmitted: Record<string, number> = {};

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    function canEmit(type: string): boolean {
      const last = lastEmitted[type] ?? 0;
      return curr.ts - last > COOLDOWN_MS;
    }

    // Crosses above 65 from below → early rotation
    if (prev.score < 65 && curr.score >= 65 && canEmit('early_rotation')) {
      dots.push({ time: curr.time, ts: curr.ts, score: curr.score, type: 'early_rotation', label: 'Early Alt Rotation' });
      lastEmitted['early_rotation'] = curr.ts;
    }

    // Crosses above 80 → altseason confirmed
    if (prev.score < 80 && curr.score >= 80 && canEmit('altseason_confirmed')) {
      dots.push({ time: curr.time, ts: curr.ts, score: curr.score, type: 'altseason_confirmed', label: 'Altseason Confirmed' });
      lastEmitted['altseason_confirmed'] = curr.ts;
    }

    // Crosses below 50 after having been above 70 → altseason fading
    if (prev.score > 50 && curr.score <= 50) {
      // check if recent high was above 70
      const lookback = points.slice(Math.max(0, i - 90), i);
      const wasHigh  = lookback.some((p) => p.score >= 70);
      if (wasHigh && canEmit('altseason_fading')) {
        dots.push({ time: curr.time, ts: curr.ts, score: curr.score, type: 'altseason_fading', label: 'Altseason Fading' });
        lastEmitted['altseason_fading'] = curr.ts;
      }
    }
  }

  return dots;
}

// ── Stablecoin / coin filters ────────────────────────────────────────────────

const SKIP_IDS = new Set([
  'bitcoin', 'ethereum',
  // Stablecoins
  'tether', 'usd-coin', 'binance-usd', 'dai', 'true-usd', 'first-digital-usd',
  'usdd', 'pax-dollar', 'frax', 'gemini-dollar', 'liquity-usd', 'fei-usd',
  'neutrino', 'husd', 'alchemix-usd', 'mim', 'tribe', 'dola-borrowing-right',
  'dollar-on-chain', 'paypal-usd', 'eurc', 'euro-coin', 'usdb',
  // Wrapped
  'wrapped-bitcoin', 'wrapped-ether', 'weth', 'staked-ether', 'lido-staked-ether',
  'rocket-pool-eth', 'coinbase-wrapped-staked-eth', 'mantle-staked-ether',
  'wrapped-steth', 'binance-staked-sol', 'jito-staked-sol',
]);

const SKIP_SYMBOL_SUFFIXES = ['usd', 'usdt', 'usdc', 'usds', 'dai', 'eur', 'btc', 'eth'];

export function isAltcoin(coin: { id: string; symbol: string; price_change_percentage_90d_in_currency?: number | null }): boolean {
  if (SKIP_IDS.has(coin.id)) return false;
  const sym = coin.symbol.toLowerCase();
  if (SKIP_SYMBOL_SUFFIXES.some((s) => sym.endsWith(s))) return false;
  // Stablecoin detection: 90d return within ±2%
  const chg = coin.price_change_percentage_90d_in_currency;
  if (chg !== null && chg !== undefined && Math.abs(chg) < 2) return false;
  return true;
}

// ── Sector classification ────────────────────────────────────────────────────

export type SectorKey = 'L1' | 'DeFi' | 'AI' | 'Meme' | 'Gaming' | 'Exchange' | 'Other';

const SECTOR_MAP: Record<string, SectorKey> = {
  // L1s
  'solana': 'L1', 'cardano': 'L1', 'avalanche-2': 'L1', 'polkadot': 'L1',
  'near': 'L1', 'algorand': 'L1', 'cosmos': 'L1', 'tron': 'L1',
  'fantom': 'L1', 'aptos': 'L1', 'sui': 'L1', 'sei-network': 'L1',
  'injective-protocol': 'L1', 'kava': 'L1', 'harmony': 'L1',
  'hedera-hashgraph': 'L1', 'internet-computer': 'L1', 'elrond-erd-2': 'L1',
  'flow': 'L1', 'icon': 'L1', 'zilliqa': 'L1',
  // DeFi
  'chainlink': 'DeFi', 'uniswap': 'DeFi', 'aave': 'DeFi', 'compound-ether': 'DeFi',
  'maker': 'DeFi', 'curve-dao-token': 'DeFi', 'synthetix-network-token': 'DeFi',
  'pancakeswap-token': 'DeFi', 'yearn-finance': 'DeFi', 'lido-dao': 'DeFi',
  'the-graph': 'DeFi', 'balancer': 'DeFi', 'sushi': 'DeFi',
  'dydx': 'DeFi', 'gmx': 'DeFi', 'jupiter-exchange-solana': 'DeFi',
  'aerodrome-finance': 'DeFi', 'hyperliquid': 'DeFi',
  // AI
  'render-token': 'AI', 'fetch-ai': 'AI', 'singularitynet': 'AI',
  'bittensor': 'AI', 'akash-network': 'AI', 'ocean-protocol': 'AI',
  'worldcoin-wld': 'AI', 'numeraire': 'AI', 'olas': 'AI',
  // Meme
  'dogecoin': 'Meme', 'shiba-inu': 'Meme', 'pepe': 'Meme', 'bonk': 'Meme',
  'floki': 'Meme', 'dogwifcoin': 'Meme', 'brett-based': 'Meme',
  'mog-coin': 'Meme', 'book-of-meme': 'Meme', 'cat-in-a-dogs-world': 'Meme',
  // Gaming
  'axie-infinity': 'Gaming', 'the-sandbox': 'Gaming', 'decentraland': 'Gaming',
  'illuvium': 'Gaming', 'gala': 'Gaming', 'immutable-x': 'Gaming',
  'pixels': 'Gaming', 'ronin': 'Gaming', 'beam-2': 'Gaming',
  // Exchange
  'binancecoin': 'Exchange', 'okb': 'Exchange', 'crypto-com-chain': 'Exchange',
  'kucoin-shares': 'Exchange', 'gate': 'Exchange', 'bitget-token': 'Exchange',
  'woo-network': 'Exchange',
};

export function getSector(coinId: string): SectorKey {
  return SECTOR_MAP[coinId] ?? 'Other';
}

export type SectorSummary = {
  sector:    SectorKey;
  label:     string;
  count:     number;
  beating:   number;
  avgReturn: number | null; // vs BTC, percentage points
  status:    'strong' | 'improving' | 'neutral' | 'weak';
};

const SECTOR_LABELS: Record<SectorKey, string> = {
  L1: 'Layer 1s', DeFi: 'DeFi', AI: 'AI Tokens',
  Meme: 'Memecoins', Gaming: 'Gaming', Exchange: 'Exchange Tokens', Other: 'Large Caps',
};

export function buildSectorSummaries(
  coins: { id: string; symbol: string; chg90d: number }[],
  btcChg90d: number
): SectorSummary[] {
  const sectorMap = new Map<SectorKey, { chgs: number[]; beating: number }>();

  for (const coin of coins) {
    const sector = getSector(coin.id);
    if (!sectorMap.has(sector)) sectorMap.set(sector, { chgs: [], beating: 0 });
    const s = sectorMap.get(sector)!;
    s.chgs.push(coin.chg90d - btcChg90d);
    if (coin.chg90d > btcChg90d) s.beating++;
  }

  const SECTOR_ORDER: SectorKey[] = ['L1', 'DeFi', 'AI', 'Meme', 'Gaming', 'Exchange'];

  return SECTOR_ORDER
    .filter((s) => sectorMap.has(s))
    .map((s) => {
      const data = sectorMap.get(s)!;
      const avgReturn = data.chgs.length > 0
        ? +(data.chgs.reduce((a, b) => a + b, 0) / data.chgs.length).toFixed(1)
        : null;
      const beatPct = data.chgs.length > 0 ? data.beating / data.chgs.length : 0;
      const status: SectorSummary['status'] =
        beatPct >= 0.65 ? 'strong'
        : beatPct >= 0.45 ? 'improving'
        : beatPct >= 0.25 ? 'neutral'
        : 'weak';
      return {
        sector: s,
        label: SECTOR_LABELS[s],
        count: data.chgs.length,
        beating: data.beating,
        avgReturn,
        status,
      };
    });
}
