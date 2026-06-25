// FRED API — St. Louis Federal Reserve
// Free key: fred.stlouisfed.org/docs/api/api_key.html
// All series fetched server-side only (key never sent to client)

export type MacroDataPoint = { date: string; value: number };

export type MacroResponse = {
  dxy:              { current: number; change1M: number; series: MacroDataPoint[] };
  fedRate:          { current: number; series: MacroDataPoint[] };
  cpiYoY:           number;
  cpiSeries:        MacroDataPoint[];
  cpiYoYSeries:     MacroDataPoint[];   // historical YoY inflation rate
  m2YoY:            number;
  m2Series:         MacroDataPoint[];
  tenYear:          { current: number; series: MacroDataPoint[] };
  twoYear:          number;
  twoYearSeries:    MacroDataPoint[];
  yieldCurveSeries: MacroDataPoint[];   // 10Y − 2Y spread
  realRate:         number;             // tenYear.current − cpiYoY
  realRateSeries:   MacroDataPoint[];   // daily 10Y yield − nearest monthly CPI YoY
  macroScore:       number;             // 0 (bullish for BTC) → 100 (bearish for BTC)
  fetchedAt:        string;
};

async function fredGet(seriesId: string, limit: number): Promise<MacroDataPoint[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) throw new Error('FRED_API_KEY not set');

  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${key}&file_type=json` +
    `&sort_order=desc&limit=${limit}`;

  const res = await fetch(url, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    let detail = '';
    try { const b = await res.json(); detail = b?.error_message ?? JSON.stringify(b); } catch {}
    throw new Error(`FRED HTTP ${res.status} (${seriesId})${detail ? ': ' + detail : ''}`);
  }

  const json = await res.json();
  return (json.observations as Array<{ date: string; value: string }>)
    .filter((o) => o.value !== '.' && o.value !== '')
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .reverse();   // oldest → newest for charts
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export async function fetchMacroData(): Promise<MacroResponse> {
  const [dxyRaw, fedRaw, cpiRaw, m2Raw, t10Raw, t2Raw] = await Promise.all([
    fredGet('DTWEXBGS', 400),  // daily broad dollar index — ~13 months
    fredGet('FEDFUNDS', 36),   // monthly fed funds rate — 3 years
    fredGet('CPIAUCSL', 62),   // monthly CPI — 5+ years for YoY
    fredGet('M2SL', 62),       // monthly M2 — 5+ years for YoY
    fredGet('DGS10', 400),     // daily 10Y yield — ~13 months
    fredGet('DGS2', 400),      // daily 2Y yield — ~13 months
  ]);

  // Current values
  const dxyCurrent = dxyRaw.at(-1)?.value ?? 0;
  const dxy1MAgo   = dxyRaw.at(-30)?.value ?? dxyCurrent;
  const dxyChange1M = dxy1MAgo !== 0 ? ((dxyCurrent - dxy1MAgo) / dxy1MAgo) * 100 : 0;

  const fedCurrent = fedRaw.at(-1)?.value ?? 0;
  const cpiCurrent = cpiRaw.at(-1)?.value ?? 0;
  const cpi12Ago   = cpiRaw.at(-13)?.value ?? cpiCurrent;
  const cpiYoY     = cpi12Ago !== 0 ? ((cpiCurrent - cpi12Ago) / cpi12Ago) * 100 : 0;

  const m2Current = m2Raw.at(-1)?.value ?? 0;
  const m212Ago   = m2Raw.at(-13)?.value ?? m2Current;
  const m2YoY     = m212Ago !== 0 ? ((m2Current - m212Ago) / m212Ago) * 100 : 0;

  const tenYearCurrent = t10Raw.at(-1)?.value ?? 0;
  const twoYearCurrent = t2Raw.at(-1)?.value ?? 0;
  const realRate       = tenYearCurrent - cpiYoY;

  // Macro score: 0 = max bullish for BTC, 100 = max bearish
  // DXY 1-month change: -3% = 0, +3% = 100
  const dxyScore     = clamp(((dxyChange1M + 3) / 6) * 100, 0, 100);
  // Fed Rate: 0% = 0, 6% = 100
  const fedScore     = clamp((fedCurrent / 6) * 100, 0, 100);
  // Real Rate: -3% = 0, +2% = 100
  const realRateScore = clamp(((realRate + 3) / 5) * 100, 0, 100);
  // M2 YoY: +15% = 0 (bullish), -5% = 100 (bearish)
  const m2Score      = clamp(((5 - m2YoY) / 20) * 100, 0, 100);
  const macroScore   = Math.round((dxyScore + fedScore + realRateScore + m2Score) / 4);

  // ── Yield curve: 10Y − 2Y spread ──────────────────────────────────────────
  const t2Map = new Map(t2Raw.map(d => [d.date, d.value]));
  const yieldCurveRaw = t10Raw
    .filter(d => t2Map.has(d.date))
    .map(d => ({ date: d.date, value: +(d.value - t2Map.get(d.date)!).toFixed(3) }));

  // ── Historical CPI YoY series (monthly) ────────────────────────────────────
  const cpiYoYSeriesRaw: MacroDataPoint[] = cpiRaw.slice(12).map((d, i) => ({
    date:  d.date,
    value: cpiRaw[i].value !== 0
      ? +((d.value - cpiRaw[i].value) / cpiRaw[i].value * 100).toFixed(2)
      : 0,
  }));
  const cpiYoYByMonth = new Map(cpiYoYSeriesRaw.map(d => [d.date.slice(0, 7), d.value]));

  // ── Real rate: 10Y yield − nearest monthly CPI YoY (historical) ───────────
  function nearestCpiYoY(dateStr: string): number | null {
    for (let offset = 0; offset < 6; offset++) {
      const d = new Date(dateStr + 'T00:00:00');
      d.setMonth(d.getMonth() - offset);
      const key = d.toISOString().slice(0, 7);
      if (cpiYoYByMonth.has(key)) return cpiYoYByMonth.get(key)!;
    }
    return null;
  }
  const realRateRaw = t10Raw
    .map(d => {
      const c = nearestCpiYoY(d.date);
      return c != null ? { date: d.date, value: +(d.value - c).toFixed(3) } : null;
    })
    .filter((d): d is MacroDataPoint => d != null);

  // ── Downsample daily series to ~52 weekly points for chart performance ─────
  function downsample(arr: MacroDataPoint[], target = 52): MacroDataPoint[] {
    if (arr.length <= target) return arr;
    const step = Math.floor(arr.length / target);
    return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
  }

  return {
    dxy:              { current: dxyCurrent, change1M: dxyChange1M, series: downsample(dxyRaw) },
    fedRate:          { current: fedCurrent, series: fedRaw },
    cpiYoY,
    cpiSeries:        cpiRaw,
    cpiYoYSeries:     cpiYoYSeriesRaw,
    m2YoY,
    m2Series:         m2Raw,
    tenYear:          { current: tenYearCurrent, series: downsample(t10Raw) },
    twoYear:          twoYearCurrent,
    twoYearSeries:    downsample(t2Raw),
    yieldCurveSeries: downsample(yieldCurveRaw),
    realRate,
    realRateSeries:   downsample(realRateRaw),
    macroScore,
    fetchedAt:        new Date().toISOString(),
  };
}

// Fetches FRED series from startDate ascending — returns [] if key not set (graceful)
export async function fredGetFrom(seriesId: string, startDate: string): Promise<MacroDataPoint[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) return [];
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${key}&file_type=json` +
    `&observation_start=${startDate}&sort_order=asc`;
  const res = await fetch(url, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.observations as Array<{ date: string; value: string }>)
    .filter((o) => o.value !== '.' && o.value !== '')
    .map((o) => ({ date: o.date, value: Number(o.value) }));
}

export type LiquiditySeriesData = {
  dxy:        MacroDataPoint[];   // DTWEXBGS daily
  realYield:  MacroDataPoint[];   // DFII10 daily (10Y TIPS real yield)
  m2:         MacroDataPoint[];   // WM2NS weekly
  fedBalance: MacroDataPoint[];   // WALCL weekly (Fed total assets)
};

export async function fetchLiquiditySeriesData(startDate = '2018-01-01'): Promise<LiquiditySeriesData> {
  const [dxy, realYield, m2, fedBalance] = await Promise.all([
    fredGetFrom('DTWEXBGS', startDate),
    fredGetFrom('DFII10',   startDate),
    fredGetFrom('WM2NS',    startDate),
    fredGetFrom('WALCL',    startDate),
  ]);
  return { dxy, realYield, m2, fedBalance };
}

export type DxyDataPoint = { date: string; value: number };

export async function fetchDXYHistory(): Promise<DxyDataPoint[]> {
  return fredGetFrom('DTWEXBGS', '1970-01-01');
}
