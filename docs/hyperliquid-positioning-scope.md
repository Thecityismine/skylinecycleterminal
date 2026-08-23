# Hyperliquid Positioning — Scope

Written 2026-08-23. Every number below was measured against the live API, not estimated.

What exists today is `/price/hyperliquid`: mark price, open interest, funding, premium and
volume, plus a funding-versus-price chart. One request per view, no stored state. This
document covers what it would take to add the position-level views: a largest-positions
table, a liquidation-wall cascade, and the two heatmaps.

---

## The thing that was wrong

The first version of this page said position views could not be built from Hyperliquid's
public API. That claim shipped, in the module header and on the page, and it was false.
Correcting it is what produced this document, so the reasoning error is worth stating:

**"Every position query requires an address" was read as a dead end.** It is not, because
the public trade feed hands you the addresses.

---

## Verified facts

Measured 2026-08-23 against `api.hyperliquid.xyz`.

**The trade feed names both counterparties.** The public `trades` subscription needs no
auth and carries a `users` array on every fill:

```json
{ "coin":"BTC", "px":"77241.0", "sz":"0.1775", "time":1787448919212,
  "users":["0xcf3f419d…","0x9266865b…"] }
```

**Per-address state carries everything the panels need.** `clearinghouseState` returns, per
open position: signed size, entry price, **liquidation price**, leverage and mode, unrealised
PnL, notional, plus account value.

```
BTC  szi=-36.6715  entry=77307.2  liqPx=222331.57  lev=5x cross   notional=$2,833,533
BTC  szi=-4.10607  entry=77230.3  liqPx=119646.73  lev=20x cross  notional=$317,268
ETH  szi=-39.9341  entry=2428.39  liqPx=6750.90    lev=20x cross  notional=$96,861
```

`liquidationPx` is `null` on small positions. Treat null as unknown, never as zero.

**Throughput.**

| Measurement | Value |
| --- | --- |
| Unique addresses, 60s across 6 coins | 355 |
| Trades/day, top 3 coins | ~510,000 |
| WebSocket payload, top 3 coins | ~146 MB/day |
| `clearinghouseState` weight | 2 (the cheapest tier) |
| Burst: 100 calls at concurrency 10 | 5.0s, zero 429s |
| Response size | ~11.7 KB |

**The burst figure is not a sustained rate.** 100 calls in five seconds proves short-burst
headroom, nothing about a full minute under load. Establish the sustained ceiling before
fixing a crawl cadence.

**What is genuinely unavailable.** Actual liquidation *events*, and any history predating
our own recording. Those live in the `hl-mainnet-node-data` S3 bucket (`node_fills_by_block`
carries the liquidation flags), which is requester-pays. Confirmed present: both it and
`hyperliquid-archive` answer `403 AccessDenied` unauthenticated.

---

## What each panel needs

| Panel | Source | Available |
| --- | --- | --- |
| Largest Open Positions | One crawl pass | Immediately |
| Liquidation Walls (cascade) | One crawl pass, bucket by `liquidationPx` | Immediately |
| Liquidation Pressure clusters | Same pass | Immediately |
| Long/short pool totals | Same pass | Immediately |
| Liquidation Heatmap | Accumulated hourly grids | Weeks to read, months to match |
| Entry Price Heatmap | Accumulated hourly grids | Same |
| Daily Liquidations | S3 `node_fills_by_block` | Only via backfill |
| History before the crawl starts | S3 | Only via backfill |

Four panels need no history at all. That is the cheap half, and it is worth noticing that
the two most striking panels in the reference are in it.

---

## Architecture

**Do not store raw position rows.** ~5,000 tracked addresses at 2–3 positions each is
~12,000 rows per pass; hourly, that is ~105M rows a year. Firestore is the wrong shape and
the wrong cost for that.

Aggregate at write time and store the projection instead, the same way the observation store
projects a report rather than re-calling vendors:

```
trades WS  ──►  address set (in memory, persisted periodically)
                      │
                      ▼
              crawl clearinghouseState
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
  top-N table    liq-price grid   entry-price grid
  (current)      (80 buckets)     (80 buckets)
      │               │               │
      └──────► one document per hour per coin ◄────┘
```

One hourly document holding an 80-bucket array is **8,760 documents per coin per year**.
That is trivial for Firestore, and it makes the heatmap a direct read rather than a
query-time aggregation.

Raw position rows are kept only long enough to build the current snapshot, then discarded.

**Four pieces of work:**

1. **Address harvester.** Long-lived WS client on the `trades` feed, accumulating addresses.
   Needs to survive reconnects and persist its set, or it starts cold on every deploy.
2. **Crawler.** Walks the address set calling `clearinghouseState`, rate-limit aware, with a
   priority order so large accounts refresh more often than dust.
3. **Rollup writer.** Buckets by price, writes the hourly document, updates the current
   snapshot.
4. **Page.** Table, cascade curve, two heatmap canvases.

**Where it runs matters.** A persistent WebSocket does not belong in a Next.js route on
Vercel. The existing scheduled functions are Firebase Cloud Functions on a cron; a
long-lived socket needs something that stays up. Either that, or drop the WS harvester and
seed addresses from periodic polling, which is less complete but fits the current
infrastructure. **This is the main architectural decision and it is not made yet.**

---

## Phasing

**Phase 1 — crawl and snapshot.** Harvester plus crawler plus the current-snapshot panels:
largest positions, liquidation walls, pressure clusters. No history needed, so it is useful
the day it ships. Also the phase that proves the rate limit and the address-set size in
production rather than in a five-second test.

**Phase 2 — accumulate.** Add the hourly rollup. Nothing new appears on the page for weeks.
Start it early precisely because it is slow; this is the same argument that justified the
observation store before anything read from it.

**Phase 3 — heatmaps.** Once the grids have enough rows to be worth drawing.

**Phase 4 — backfill, only if wanted.** AWS account, requester-pays reads from
`hl-mainnet-node-data`, and a job to replay fills into the same grids. This is also the only
route to real liquidation events. Skippable: phases 1–3 stand without it.

---

## Open questions

| Question | Why it matters |
| --- | --- |
| Sustained rate limit | Sets crawl cadence and how many addresses can be tracked |
| How many addresses hold meaningful notional | Decides whether the set is thousands or tens of thousands |
| Where the WS harvester runs | Vercel routes cannot hold a socket open |
| Retention on hourly grids | Cheap, but unbounded growth still needs a policy |
| S3 backfill volume and cost | Unmeasured. Phase 4 only |

---

## Scope decisions on record

**Publishing addresses is a deliberate choice.** The largest-positions table names wallets
alongside their liquidation prices. The data is public and the reference product does it,
but it amounts to publishing a target list, and it should be an explicit decision rather
than a default that arrives with the feature.

**Never infer a liquidation level.** Every figure comes from `liquidationPx` as the venue
reports it. Estimating liquidation levels from open interest and assumed leverage is what
most "liquidation heatmaps" do; it produces a plausible picture that is not a measurement,
and this is a terminal people check numbers against.

**Null is unknown, not zero.** Small positions return `liquidationPx: null`. They are
excluded from the cascade rather than bucketed at the bottom.

**Two dates, as everywhere else.** Grids record when the state was observed, not just the
hour they describe, so a gap in crawling is visible rather than silently interpolated.

---

## Related

- `docs/research-desk-roadmap.md` — the store and rollup pattern this follows
- `lib/api/hyperliquid.ts` — the aggregates page, and the corrected note on why the
  position views are absent rather than impossible
- Reference: chartinspect.com/charts/hyperliquid
