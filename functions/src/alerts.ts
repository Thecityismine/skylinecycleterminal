// ── Types ──────────────────────────────────────────────────────────────────────

export type SignalsPayload = {
  btcRegime:              string;
  btcAbove2yma:           boolean | null;
  btcAbove200wma:         boolean | null;
  btcAbove200dma:         boolean | null;
  weeklyZoneBtc:          string;
  piCycleRatio:           number | null;
  piCycleInZone:          boolean;
  haLastCompletedMonth:   string | null;
  haLastCompletedIsGreen: boolean;
  haPrevCompletedIsGreen: boolean;
  ethAbove2yma:           boolean | null;
  ethAbove200dma:         boolean | null;
  halvingPhaseKey:        string | null;
  halvingPhaseLabel:      string | null;
  btcPrice:               number;
  ethPrice:               number;
};

export type CyclePayload = {
  zone:      string;
  zoneLabel: string;
  score:     number;
};

export type StoredState = {
  cycleZone?:              string;
  halvingPhaseKey?:        string | null;
  btcRegime?:              string;
  btcAbove2yma?:           boolean | null;
  btcAbove200wma?:         boolean | null;
  weeklyZoneBtc?:          string;
  piCycleInZone?:          boolean;
  haLastCompletedMonth?:   string | null;
  haLastCompletedIsGreen?: boolean;
  haPrevCompletedIsGreen?: boolean;
  ethAbove2yma?:           boolean | null;
  ethAbove200dma?:         boolean | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function usd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function changed<T>(prev: T | undefined, curr: T): boolean {
  return prev !== undefined && prev !== curr;
}

function boolChanged(prev: boolean | null | undefined, curr: boolean | null): boolean {
  return prev != null && curr != null && prev !== curr;
}

// ── Main alert comparison ──────────────────────────────────────────────────────

export function computeAlerts(
  s: SignalsPayload,
  c: CyclePayload,
  prev: StoredState
): string[] {
  // First run — seed state without alerting
  if (Object.keys(prev).length === 0) return [];

  const alerts: string[] = [];

  // 1. Skyline Cycle Score zone change
  if (changed(prev.cycleZone, c.zone)) {
    const emoji = ({ accumulate: '🟢', build: '🔵', caution: '🟡', distribution: '🔴' } as Record<string, string>)[c.zone] ?? '⚪';
    alerts.push(
      `${emoji} *Cycle Zone → ${c.zoneLabel}* (score: ${Math.round(c.score)})\n` +
      `_Was: ${prev.cycleZone}_`
    );
  }

  // 2. Halving phase entry (only alert on phases user cares about)
  const watchedPhases = new Set(['deep_accum', 'build', 'bull_expansion']);
  if ('halvingPhaseKey' in prev && prev.halvingPhaseKey !== s.halvingPhaseKey) {
    if (s.halvingPhaseKey && watchedPhases.has(s.halvingPhaseKey)) {
      const emoji = ({ deep_accum: '🟦', build: '🟩', bull_expansion: '🚀' } as Record<string, string>)[s.halvingPhaseKey] ?? '📅';
      alerts.push(`${emoji} *Halving Phase Entered: ${s.halvingPhaseLabel}*`);
    }
  }

  // 3. BTC Market Regime change (200-day MA cross)
  if (changed(prev.btcRegime, s.btcRegime)) {
    const emoji = s.btcRegime === 'bull' ? '📈' : s.btcRegime === 'bear' ? '📉' : '➡️';
    alerts.push(
      `${emoji} *BTC Regime → ${s.btcRegime.toUpperCase()}* — ${usd(s.btcPrice)}\n` +
      `_Crossed 200-Day MA · was: ${prev.btcRegime}_`
    );
  }

  // 4. BTC crosses 2-Year MA (730d)
  if (boolChanged(prev.btcAbove2yma, s.btcAbove2yma)) {
    const dir   = s.btcAbove2yma ? 'crossed ↑ ABOVE' : 'crossed ↓ BELOW';
    const emoji = s.btcAbove2yma ? '💚' : '🔵';
    alerts.push(`${emoji} *BTC ${dir} 2-Year MA* — ${usd(s.btcPrice)}`);
  }

  // 5. BTC crosses 200-Week MA (realized price proxy)
  if (boolChanged(prev.btcAbove200wma, s.btcAbove200wma)) {
    const dir   = s.btcAbove200wma ? 'crossed ↑ ABOVE' : 'crossed ↓ BELOW';
    const emoji = s.btcAbove200wma ? '📈' : '🔵';
    alerts.push(`${emoji} *BTC ${dir} 200-Week MA* — ${usd(s.btcPrice)}`);
  }

  // 6. Weekly SMA zone change (Bull / Bear / Accumulation)
  if (changed(prev.weeklyZoneBtc, s.weeklyZoneBtc)) {
    const names: Record<string, string> = {
      bull: 'Bull Zone', bear: 'Bear Zone', cheap: 'Accumulation Zone', none: 'No Signal',
    };
    const emoji = s.weeklyZoneBtc === 'bull' ? '🟢' : s.weeklyZoneBtc === 'cheap' ? '🔵' : '🔴';
    alerts.push(
      `${emoji} *BTC Weekly SMA → ${names[s.weeklyZoneBtc] ?? s.weeklyZoneBtc}*\n` +
      `_Was: ${names[prev.weeklyZoneBtc ?? ''] ?? prev.weeklyZoneBtc}_`
    );
  }

  // 7. Pi Cycle Bottom MA cross (into zone or recovery)
  if (changed(prev.piCycleInZone, s.piCycleInZone)) {
    if (s.piCycleInZone) {
      alerts.push(
        `🔵 *Pi Cycle Bottom Signal FIRED*\n` +
        `_150d MA crossed below 471d×0.745 — historical bear market bottom zone_`
      );
    } else {
      alerts.push(
        `🟢 *Pi Cycle Recovery Confirmed*\n` +
        `_150d MA crossed back above threshold — structural bull resumption_`
      );
    }
  }

  // 8. Heikin-Ashi: first green monthly candle after a red candle
  const newMonth = prev.haLastCompletedMonth != null
    && prev.haLastCompletedMonth !== s.haLastCompletedMonth;
  if (newMonth && s.haLastCompletedIsGreen && !s.haPrevCompletedIsGreen) {
    alerts.push(
      `🟢 *Heikin-Ashi: Monthly Green After Red*\n` +
      `_${s.haLastCompletedMonth} printed green after a red month — trend reversal signal_`
    );
  }

  // 9. ETH crosses 200-Day MA
  if (boolChanged(prev.ethAbove200dma, s.ethAbove200dma)) {
    const dir   = s.ethAbove200dma ? 'crossed ↑ ABOVE' : 'crossed ↓ BELOW';
    const emoji = s.ethAbove200dma ? '📈' : '📉';
    alerts.push(`${emoji} *ETH ${dir} 200-Day MA* — ${usd(s.ethPrice)}`);
  }

  // 10. ETH crosses 2-Year MA (730d)
  if (boolChanged(prev.ethAbove2yma, s.ethAbove2yma)) {
    const dir   = s.ethAbove2yma ? 'crossed ↑ ABOVE' : 'crossed ↓ BELOW';
    const emoji = s.ethAbove2yma ? '💚' : '🔵';
    alerts.push(`${emoji} *ETH ${dir} 2-Year MA* — ${usd(s.ethPrice)}`);
  }

  return alerts;
}

export function toStoredState(s: SignalsPayload, c: CyclePayload): StoredState {
  return {
    cycleZone:              c.zone,
    halvingPhaseKey:        s.halvingPhaseKey,
    btcRegime:              s.btcRegime,
    btcAbove2yma:           s.btcAbove2yma,
    btcAbove200wma:         s.btcAbove200wma,
    weeklyZoneBtc:          s.weeklyZoneBtc,
    piCycleInZone:          s.piCycleInZone,
    haLastCompletedMonth:   s.haLastCompletedMonth,
    haLastCompletedIsGreen: s.haLastCompletedIsGreen,
    haPrevCompletedIsGreen: s.haPrevCompletedIsGreen,
    ethAbove2yma:           s.ethAbove2yma,
    ethAbove200dma:         s.ethAbove200dma,
  };
}
