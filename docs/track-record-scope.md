# `/track-record` — Build Scope

**Date**: 2026-07-27
**Origin**: Tier 1 action item from [AltIndex competitor profile](../../marketing/competitor-profiles/altindex.md) — the answer to their `/results` page.
**Verdict**: **Viable, and much cheaper than expected.** The backtest engine already exists. This is mostly a methodology fix plus a page.

---

## 1. What already exists

Three pieces are already built, which collapses most of the expected work:

| Piece | Location | Status |
|---|---|---|
| Historical score engine | `lib/indicators/historicalScore.ts` | Computes a 4-indicator price-only proxy across full BTC history |
| API route | `app/api/cycle/history/route.ts` | Live, `revalidate = 3600`, weekly-downsampled |
| Cycle turning points | `lib/indicators/cycleAnchors.ts` | `CYCLE_ANCHORS` — 2015 low, 2017 top, 2018 low, 2021 top, 2022 low |

The remaining work is **not** "build a backtest." It's: fix one methodological flaw, decide how to label the proxy, and build the page.

---

## 2. The two honesty problems

### Problem A — lookahead bias (must fix)

`historicalScore.ts` percentile-ranks every day against the **complete** historical distribution, including days that hadn't happened yet. The code says so directly:

> "Scoring a day against the full distribution is 'hindsight'…"

That is fine for a "where does this sit in all of BTC history" chart. It is **not** fine for a page claiming "here is what the score said at the 2017 top," because the 2017 reading is computed using 2018–2026 data. Anyone who understands backtesting will find this immediately, and it would hand away the exact credibility advantage the page exists to build.

**Empirically measured**, both modes at the shipped 2012-01-01 reference window, daily (no downsampling):

| Event | Date | BTC | A: full-distribution | B: point-in-time | Δ |
|---|---|---|---|---|---|
| 2015 bottom | 2015-01-14 | $152 | 9 · Accumulate | 5 · Accumulate | −4 |
| 2017 top | 2017-12-17 | $19,783 | 98 · Distribution | 95 · Distribution | −3 |
| 2018 bottom | 2018-12-15 | $3,122 | 10 · Accumulate | 10 · Accumulate | 0 |
| **2021 top** | 2021-11-10 | $68,990 | **75 · Distribution (hit)** | **68 · Caution (miss)** | **−7** |
| 2022 bottom | 2022-11-21 | $15,476 | 3 · Accumulate | 4 · Accumulate | +1 |

**This is the finding that settles the question.** Under hindsight normalization the score reads 75 at the 2021 top and clears into Distribution Risk — a perfect 5/5 record. Point-in-time, it reads 68 and misses. The lookahead bias does not merely shade the numbers; **it manufactures the perfect track record.** Publishing the hindsight version would mean publishing a 5/5 that the model never actually earned.

Overall zone disagreement between the two methods is 9.5% of days (403 of 4,225) from 2015 to present.

**Separately, reference-window sensitivity is low.** Like-for-like point-in-time, moving the start from 2012 to 2010 shifts the five anchor readings by at most 3 points and changes no zones. (An earlier draft of this doc quoted a 20 → 9 swing for the 2015 bottom; that number conflated a mode change with a window change and was wrong.)

**Conclusion**: point-in-time is mandatory, and the honest result is 4/5.

### Problem B — the proxy is not the live score (must label)

The live Cycle Score is **11 indicators**. The historical engine is **4** (Pi Cycle ratio, MVRV proxy, 2Y MA multiplier, power law), because those are the only ones derivable from price alone.

A full 11-indicator reconstruction is **not achievable**:
- Fear & Greed history begins Feb 2018 — no 2015 or 2017 coverage
- Stablecoin supply, Reserve Risk, hash ribbons, active addresses, NVT all need historical on-chain series with their own start dates and vendor limits

So the page must state plainly that the historical series is a **price-structure proxy** of the Cycle Score, not the live score itself, and show which four indicators it uses. That admission is on-brand — it's the same move as the Deep Research report's "data gaps" section.

### Sensitivity note

The reference window materially changes readings. With history starting 2012-01-01 (what the route currently passes) the 2015 low reads **20**; including 2010–2011 it reads **9**. The page must pin and state the window. Recommend starting at **2012-01-01** for consistency with the shipped route and the "2012" figure already on the landing page.

---

## 3. Recommended approach

Publish the point-in-time proxy, labelled precisely, with the miss shown as prominently as the hits.

**The story the data actually tells** (point-in-time, 2012 window — the shipped numbers):
- Three of three cycle bottoms read **Accumulate** (5, 10, 4)
- The 2017 top read **95 — Distribution Risk**
- The 2021 top read **68 — Caution.** It did *not* reach Distribution Risk, and its best reading within 30 days was only 69. **This is the miss, and it leads the page**, in the same spirit as AltIndex listing Worksport at −77.8%.

One clean miss out of five is more persuasive than five clean hits, and it is the truth.

---

## 4. Build plan

| # | Task | Files | Size |
|---|---|---|---|
| 1 | Add expanding-window (point-in-time) scoring alongside the existing full-distribution mode | `lib/indicators/historicalScore.ts` | ~half day |
| 2 | Extend the API to serve both modes and stop weekly-downsampling near anchor dates so turning points aren't smoothed away | `app/api/cycle/history/route.ts` | small |
| 3 | Anchor-reading helper: given `CYCLE_ANCHORS`, return score + zone at each turn, plus best/worst reading in a ±30d window around it | new `lib/indicators/trackRecord.ts` | ~half day |
| 4 | `/track-record` page: summary table, score-vs-price chart with anchors marked, honest-miss callout, methodology block | new `app/(free)/track-record/page.tsx` | ~1 day |
| 5 | Methodology disclosure: which 4 indicators, point-in-time explanation, reference window, why it isn't the 11-indicator live score | same page | small |
| 6 | Link from landing page + nav; add to `sitemap.ts` | `app/page.tsx`, `app/sitemap.ts` | small |
| 7 | Once shipped, upgrade the landing hero zone copy to the stronger historically-grounded claim it currently avoids | `components/landing/CycleScoreHero.tsx` | small |

Roughly **2–3 focused days**.

**Route placement**: `(free)` — this is a top-of-funnel trust asset and an SEO target. Gating it defeats the purpose.

---

## 5. Open decisions

1. **Add a 2013 cycle?** `CYCLE_ANCHORS` starts at the 2015 low, so the 2013 top (~$1,163, Nov 2013) isn't covered. Price data supports it. Adding it means editing a file other features read from (`getCompletedCycles`, timing models) — check for side effects before touching.
2. **Publish the full daily series, or just the anchors?** Full series is more auditable (AltIndex lists all 148 picks). Recommend a downloadable CSV alongside the table.
3. **Keep the existing hindsight mode anywhere?** It is arguably the better view for "where does today sit in all of history." Could stay as a labelled toggle. Default must be point-in-time.

---

## 6. Risks

- **Anchor dates are judgement calls.** 2021's top is contested (Nov 10 ATH vs the Apr 2021 local high). State the definition used.
- **Vendor dependency.** The whole page rests on CoinMetrics daily closes. A schema or availability change breaks it — cache the computed series rather than recomputing per request.
- **The 2021 near-miss invites "so it doesn't work."** Pre-empt it in the copy: the score is a position read, not a top-caller, and 66/100 was still the highest reading of that cycle.
- **Don't let the page drift into prediction.** It describes what the model read at known historical turns. It must not project the current cycle's top.

---

## 7. Implementation status — shipped 2026-07-27

Built and verified:

| Piece | File |
|---|---|
| Point-in-time mode + exported `downsampleWeekly` | `lib/indicators/historicalScore.ts` |
| Anchor-reading engine | `lib/indicators/trackRecord.ts` (new) |
| API | `app/api/track-record/route.ts` (new) |
| Page | `app/(free)/track-record/page.tsx` (new) |
| Optional turning-point markers | `components/charts/ScoreHistoryChart.tsx` (`markers` prop, opt-in) |
| Public route + indexing | `proxy.ts`, `app/sitemap.ts` |
| Landing nav + section | `app/page.tsx` |
| Hero copy upgraded to evidenced claims | `components/landing/CycleScoreHero.tsx` |

**Shipped result: 4/5.** Bottoms 5 / 10 / 4 (all Accumulate), 2017 top 95 (Distribution Risk), 2021 top 68 (Caution — the miss, best nearby reading 69 on 2021-10-20).

Deviations from the plan above:
- Built a **separate** `/api/track-record` route rather than extending `/api/cycle/history`, so `/cycle` keeps its existing behaviour with zero regression risk.
- `/cycle` still uses full-distribution normalization. That is defensible for a retrospective "where does today sit in all of history" chart, and it is labelled as a proxy — but it is worth revisiting, since the hindsight mode is what would have shown a perfect 5/5.
- Skipped: 2013 cycle anchor (task 1 in §5 — `CYCLE_ANCHORS` is shared with the timing models and needs a side-effect check first), and the hindsight/point-in-time UI toggle (kept the page single-method to avoid offering a flattering view alongside the honest one).
- Added: CSV download of the full series, for auditability.

---

## 8. Verification artifact

Comparison script used for §2: `scratchpad/lookahead-test.mjs` (fetches `/api/price?range=max`, recomputes both normalizations, prints anchor readings and zone-disagreement rate). Re-runnable against a local dev server.
