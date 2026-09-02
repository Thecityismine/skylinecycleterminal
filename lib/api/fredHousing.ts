import 'server-only';

// Housing and real-estate series from FRED.
//
// HISTORY DEPTH IS THE DESIGN CONSTRAINT HERE, and it is not uniform. FRED
// serves some series in full and others as a short rolling window, depending on
// who licenses the underlying data. Measured 2026-09:
//
//   Census / Fed / BLS / Freddie Mac ....... 35 to 74 years. Percentile-scoreable.
//   Realtor.com (listings, days on market) .. exactly 10 years, from 2016-07.
//   NAR (FIXHAI, EXHOSLUSM495S) ............. TWELVE MONTHS.
//
// That last one matters. FIXHAI is the obvious series to reach for when scoring
// affordability, and it is useless for it: a percentile computed over twelve
// observations says nothing. Affordability is therefore COMPUTED here from
// median price, the 30-year mortgage rate and median income, all of which have
// decades behind them.
//
// This is the same trap as FRED's SP500 series, which is licensed as a rolling
// ten-year window and silently made the recession chart's range buttons look
// broken. Check the span before scoring against a FRED series.

const FRED_API = 'https://api.stlouisfed.org/fred/series/observations';

export type FredPoint = { date: string; value: number };

/** Depth of history behind a series, which decides how it may be scored. */
export type Depth = 'deep' | 'shallow' | 'sparse';

export type HousingSeriesMeta = {
  id:     string;
  label:  string;
  /** Shortest sensible start. Nothing is gained by asking for more. */
  start:  string;
  depth:  Depth;
  /** Human note on the source, shown in the page's data-coverage section. */
  source: string;
};

export const HOUSING_SERIES = {
  // ── Supply ────────────────────────────────────────────────────────────────
  monthsSupply:   { id: 'MSACSR',        label: 'Months supply, new homes',  start: '1963-01-01', depth: 'deep',    source: 'Census' },
  activeListings: { id: 'ACTLISCOUUS',   label: 'Active listings',           start: '2016-01-01', depth: 'shallow', source: 'Realtor.com' },
  daysOnMarket:   { id: 'MEDDAYONMARUS', label: 'Median days on market',     start: '2016-01-01', depth: 'shallow', source: 'Realtor.com' },
  priceReduced:   { id: 'PRIREDCOUUS',   label: 'Listings with price cuts',  start: '2016-01-01', depth: 'shallow', source: 'Realtor.com' },
  newListings:    { id: 'NEWLISCOUUS',   label: 'New listings',              start: '2016-01-01', depth: 'shallow', source: 'Realtor.com' },
  newHomesForSale:{ id: 'HNFSEPUSSA',    label: 'New houses for sale',       start: '1963-01-01', depth: 'deep',    source: 'Census' },

  // ── Price ─────────────────────────────────────────────────────────────────
  caseShiller:    { id: 'CSUSHPINSA',    label: 'Case-Shiller national',     start: '1987-01-01', depth: 'deep',    source: 'S&P' },
  medianPrice:    { id: 'MSPUS',         label: 'Median sales price',        start: '1963-01-01', depth: 'deep',    source: 'Census' },
  fhfa:           { id: 'USSTHPI',       label: 'FHFA house price index',    start: '1975-01-01', depth: 'deep',    source: 'FHFA' },

  // ── Affordability inputs ──────────────────────────────────────────────────
  mortgage30:     { id: 'MORTGAGE30US',  label: '30-year fixed rate',        start: '1971-01-01', depth: 'deep',    source: 'Freddie Mac' },
  // NOMINAL income (…646N), not real (…672N). This matters more than it looks.
  //
  // Median sales price is nominal, so pairing it with CPI-adjusted income mixes
  // units and silently corrupts every historical ratio. The two series converge
  // at the 2024 base year and diverge badly before it: 1984 reads $22,420
  // nominal against $60,420 real. Using the real series made 1984 price-to-income
  // look like 1.3x when it was actually 3.5x, which flattened the whole
  // historical distribution and pushed today's percentile up near 94 when it
  // does not belong there. Both series must be nominal or both real.
  medianIncome:   { id: 'MEHOINUSA646N', label: 'Median household income', start: '1984-01-01', depth: 'deep', source: 'Census · annual, nominal' },
  cpiRent:        { id: 'CUSR0000SEHA',  label: 'CPI rent of residence',     start: '1981-01-01', depth: 'deep',    source: 'BLS' },

  // ── Activity / cycle ──────────────────────────────────────────────────────
  housingStarts:  { id: 'HOUST',         label: 'Housing starts',            start: '1959-01-01', depth: 'deep',    source: 'Census' },
  buildingPermits:{ id: 'PERMIT',        label: 'Building permits',          start: '1960-01-01', depth: 'deep',    source: 'Census' },
  newHomeSales:   { id: 'HSN1F',         label: 'New one-family homes sold', start: '1963-01-01', depth: 'deep',    source: 'Census' },

  // ── Credit ────────────────────────────────────────────────────────────────
  mortgageDelinq: { id: 'DRSFRMACBS',    label: 'Mortgage delinquency rate', start: '1991-01-01', depth: 'deep',    source: 'Fed' },
  lendingStandards:{ id: 'DRTSCILM',     label: 'Banks tightening standards',start: '1990-01-01', depth: 'deep',    source: 'Fed SLOOS' },

  // ── Sentiment ─────────────────────────────────────────────────────────────
  consumerSentiment:{ id: 'UMCSENT',     label: 'Consumer sentiment',        start: '1978-01-01', depth: 'deep',    source: 'U. Michigan' },
  rentalVacancy:  { id: 'RRVRUSQ156N',   label: 'Rental vacancy rate',       start: '1956-01-01', depth: 'deep',    source: 'Census' },
} as const satisfies Record<string, HousingSeriesMeta>;

export type HousingKey = keyof typeof HOUSING_SERIES;

export type HousingData = Record<HousingKey, FredPoint[]>;

async function fetchSeries(meta: HousingSeriesMeta): Promise<FredPoint[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) throw new Error('FRED_API_KEY not set');

  const url =
    `${FRED_API}?series_id=${meta.id}&api_key=${key}&file_type=json` +
    `&sort_order=asc&observation_start=${meta.start}`;

  const res = await fetch(url, {
    // Housing data is monthly at best; an hour of cache costs nothing and keeps
    // a page refresh from making twenty upstream calls.
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`FRED ${meta.id} HTTP ${res.status}`);

  const json = await res.json();
  return (json.observations as Array<{ date: string; value: string }>)
    .filter((o) => o.value !== '.' && o.value !== '')
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((p) => Number.isFinite(p.value));
}

/**
 * Fetches every series in parallel.
 *
 * A failed series yields an empty array rather than throwing. Housing data comes
 * from six different agencies and one of them being down should degrade the
 * score's coverage, not blank the page — the scorer reports how many pillars
 * actually reported, the same way the Cycle Score does.
 */
export async function fetchHousingData(): Promise<HousingData> {
  const keys = Object.keys(HOUSING_SERIES) as HousingKey[];
  const settled = await Promise.allSettled(
    keys.map((k) => fetchSeries(HOUSING_SERIES[k])),
  );

  const out = {} as HousingData;
  keys.forEach((k, i) => {
    const r = settled[i];
    if (r.status === 'fulfilled') {
      out[k] = r.value;
    } else {
      console.error(`[fredHousing] ${HOUSING_SERIES[k].id} failed:`, r.reason?.message ?? r.reason);
      out[k] = [];
    }
  });
  return out;
}
