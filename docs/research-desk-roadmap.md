# Skyline Research Desk — Roadmap and Handoff

Written 2026-08-22. Verified against live Firestore and the deployed site, not from memory.

The premise: Galaxy Digital's research advantage is not a dataset, it is a system.
Roughly 85% of it is labour and process rather than vendor spend. This is Skyline's
version of that system, what exists so far, and what comes next.

---

## Current state

Verified 2026-08-22.

| Module | Status | Data |
| --- | --- | --- |
| Observation store | Running, autonomous | 3,207 docs · 3 point-in-time days (19–21 Aug) |
| Adoption Index | Built, being populated | 3 initiatives |
| EDGAR candidate feed | Running, autonomous | 126 filings · 63 triaged |
| Thesis register | Built, **empty** | 0 theses |

**Nothing reads from the store yet.** The research surfaces still compute live from
vendors. That switch is deliberate future work, not an oversight.

### Seeded vs not

```
fear_greed              3,120 rows  back to Feb 2018
cycle_score                 3 rows  accumulating daily
btc_price_usd               3 rows  accumulating daily
btc_market_cap_usd          0 rows  NOT SEEDED
btc_tx_count                0 rows  NOT SEEDED
btc_active_addresses        0 rows  NOT SEEDED
btc_issuance_native         0 rows  NOT SEEDED
stablecoin_supply_usd       0 rows  NOT SEEDED
```

Seeding the five empty sources is three clicks at `/admin/store` and takes the store
past 30,000 rows with history to 2012. Anything comparing a reading to its own
distribution needs them. **Cheapest value left on the table.**

---

## What is built

### 1. Observation store — `lib/store/`

Point-in-time history. The thing that separates a research desk from a dashboard.

| File | Role |
| --- | --- |
| `observations.ts` | Types, append-only write, point-in-time read, metric registry |
| `snapshot.ts` | Projects one research report run into observations |
| `backfill.ts` | Seeds from vendor historical series |
| `health.ts` | Coverage, shaped for the admin panel |

**The core idea:** two dates per row. `metricDate` is the day the value describes,
`observedDate` is the day Skyline recorded it. A vendor revision lands as a second
row rather than overwriting the first, which is what makes "as known on date X"
answerable and is the only honest basis for a track record.

Rows seeded from vendor history carry `backfilled: true` and are excluded from
point-in-time reads. They already contain every revision made since, and Skyline was
not running then. Fine for distributions, not for claiming a call.

Surface: `/admin/store`. Cron: `dailySnapshot`, 08:30 ET.

### 2. Institutional Adoption Index — `lib/adoption/`

The one dataset nobody sells. Inputs are public, the classified series is not.

| File | Role |
| --- | --- |
| `schema.ts` | Types, stage ladder, verification weights, derived series. **Pure** |
| `initiatives.ts` | Firestore IO |
| `edgar.ts` | SEC full-text search, candidate feed, triage persistence |

**Two axes, kept separate on purpose.** Stage says how far an institution claims to
have gone (0 Rumor to 5 Expansion). Verification says how much of that claim can be
checked without taking their word (public chain 1.0, private 0.8, issuer reported
0.7, press release 0.5). Weighted index is the product.

Collapsing them into one scale double-counts, because pilot and announcement already
live on the stage axis. Separating them means a pilot you can verify on-chain
outranks a production launch you cannot, which is the correct ordering.

Surface: `/admin/adoption`. Cron: `dailyEdgarPull`, 07:00 ET.

### 3. Thesis register — `lib/theses/`

| File | Role |
| --- | --- |
| `schema.ts` | Types, rule evaluation, track record. **Pure** |
| `theses.ts` | Firestore IO, evaluation against the store |

Every thesis records what would prove it wrong, before the fact. Invalidation
conditions are machine-checkable rules against stored metrics, evaluated by
`dailySnapshot` right after it writes the day's readings.

**Invalidated and Wrong are separate statuses, and the hit rate counts only Wrong.**
A pre-registered condition tripping is the process working. Scoring it as a miss
would punish the discipline the register exists to create.

Surface: `/admin/theses`. **Currently empty. Write the first one.**

### 4. Share card integrity — `lib/share/`

`cardDate.ts` stamps cards with their data date rather than the render time.
`liveSpot.ts` puts live spot on the headline price while the chart stays on daily
closes. Page stats and cards read the same number, which they did not before.

---

## What to build next

Ordered by value, not by appeal.

### Now, no code required

**Write the first thesis.** The register is built and empty. The ETH settlement-layer
view is the obvious one, and the Adoption Index is already accumulating evidence for
and against it. Useful the day it exists.

**Seed the five empty store sources.** Three clicks.

**Backfill the Adoption Index.** EDGAR only surfaces what filed this week, so it will
never show BUIDL, BENJI or Kinexys. Twenty entries is enough to chart against price.
Candidates: BUIDL, BENJI, ACRED, Hamilton Lane, IBIT, FBTC, BTCO, EZBC, BTCW, and
Kinexys as several initiatives under one `program`.

### Next, in order

**1. Development tracking (engine E4).** The one covered engine still missing.
Ethereum ACD notes from `ethereum/pm`, Solana SIMDs, Realms votes, Anza releases.
Record `expected_date` against `actual_date` so shipping slippage becomes a scored
series. Quantifies the thing Lucas named as Ethereum's main risk. Payoff needs months
of history, which is why it is second rather than first.

**2. Adoption Index chart.** Live initiatives against BTC price. The publishable
artefact. Blocked on the backfill, not on code.

**3. Narrative / fundamentals divergence.** Fundamentals and shipping rising while
price and attention fall. The strongest idea in the original memo and the most
differentiated thing available. Needs months of stored fundamentals plus sentiment.

**4. Point research surfaces at the store.** Only when a metric has enough history to
be worth reading and the daily run has been stable a while. A metric with four rows
is not history. Check `/admin/store` coverage first.

**5. EDGAR triage automation.** Tier 1 is rules (auto-dismiss `N-PX`, `485APOS`,
`N-CSRS`, `497` from fund trusts, protected by an allowlist of real crypto issuers)
and cuts maybe 30–40%. Tier 2 is a model reading the filing and proposing a draft
classification, which is where the real win is. **Tier 2 is blocked**: SEC returns
403 on filing bodies without a declared contact address. Set `SEC_USER_AGENT` to
`Name contact@yourdomain.com` to unblock.

**Automate triage and extraction. Never automate classification.** The index is worth
owning because a person decided a given announcement was a pilot rather than
production. If a model assigns stages, the series becomes reproducible by anyone with
the same model and the moat evaporates.

---

## Design rules that must not be broken

**One computation, many projections.** Two surfaces computing the same thing by
different routes will eventually disagree. The landing preview and the research
report did exactly that once, naming different regimes on the same day. The snapshot
projects `buildDeepResearchReport()` rather than calling vendors again; anything new
worth storing gets added to the report first and picked up from there.

**Two dates on everything historical.** When it happened, and when Skyline learned of
it. Applies to the store, the Adoption Index and share cards. It is what makes a late
entry accurate rather than a lie, and it means falling behind costs completeness but
never correctness.

**Client components never import server modules.** Anything reaching `firebase-admin`
drags `google-auth-library` into the browser bundle and fails the build. This is why
`lib/adoption/schema.ts` and `lib/theses/schema.ts` are split from their IO
siblings. Pure half for the client, IO half for the server.

**Chart routes are `force-dynamic` plus `fetchCache = 'default-cache'`.** `revalidate`
alone is stale-while-revalidate: the first visitor after expiry gets the previous
render, so on a low-traffic page every visit shows old data and staleness is
unbounded. `force-dynamic` alone is documented as setting every fetch to `no-store`,
which would re-fetch full vendor history per view. Both together, or neither.

**Every stage change needs a source URL.** A point that cannot be traced to something
public is an opinion.

---

## Open items

| Item | Impact | Status |
| --- | --- | --- |
| Reserve Risk inert | 10% of the Cycle Score is a hardcoded neutral 50. `SplyAct1yr` is paywalled | Deferred. Fix is reweighting, not buying data |
| 31 public API routes | `/api/cycle` and others serve the paid analysis unauthenticated. `proxy.ts` excludes `api` from its matcher | Parked until the agent project |
| Coin Metrics licence | Paid product runs on a CC BY-NC community feed, imported by ~75 files | Priced 2026-08-21 and accepted. **Do not re-raise** |
| `valueAsOf` field | `valueUsd` has no date, so any figure silently rots | Not built. Field left blank everywhere |
| Candidate queue caps at 60 | No truncation indicator | Not fixed. Refresh reveals the rest |
| React hooks lint | ~130 errors in `components/share` from Next 16's compiler-era rules | Pre-existing. Build does not lint, so invisible |
| Theses not alerting | `dailySnapshot` returns tripped theses but Telegram only covers signals and score | Wiring left to do |

### Facts worth not rediscovering

- Coin Metrics free tier **does** serve `CapMVRVCur` and `SplyExNtv`. Only
  `CapRealUSD` and `SplyAct1yr` return 403.
- `CapRealUSD` is exactly `CapMrktCurUSD / CapMVRVCur`, both free. Realized cap needs
  no subscription.
- EDGAR **search** works with a neutral User-Agent. Filing **bodies** need a contact
  address.
- `CF Office: 09 Crypto Assets` and `SIC 6221` appear identically on Fidelity Solana
  Fund and Canary Staked TRX ETF, so no SEC metadata field separates institutional
  from crypto-native.

---

## Operating cadence

| Job | When | Time |
| --- | --- | --- |
| EDGAR triage | Weekly | 10 min |
| Stage promotions | Event driven | 2 min |
| Store health glance | Monthly | 1 min |
| Adoption backfill | Once | An evening |
| Everything else | Automatic | 0 |

Skipping a week costs completeness, never accuracy, because of the two-date design.
The only real failure mode is a queue big enough that you stop opening it, which is
why weekly rather than monthly.

### Scope decisions on record

**Crypto-native firms are out.** CoinShares, Canary, Bitwise, Grayscale, BitMine. The
index answers whether traditional finance moved on-chain, and crypto-native firms in
the numerator make that unanswerable. The test: did this firm manage non-crypto money
before crypto existed?

**Treasury companies are out for now.** If added later, give them their own category
so they stay separable.

**Equity ETFs are out.** `WGMI` holds mining company shares. Nothing settles on a
blockchain.

---

## Deploy notes

```
git push origin main                                              # Vercel auto-deploys
npx firebase-tools deploy --only firestore:indexes,firestore:rules
npx firebase-tools deploy --only functions
```

**Order matters.** Functions call routes on the live site, so deploying a function
before the app that serves its route fails every morning until the app catches up.

**Functions deploy timing out** with "Cannot determine backend specification" is not a
code fault. The project sits in a Dropbox folder and cold module loads trip the CLI's
10-second discovery limit. Prefix with `FUNCTIONS_DISCOVERY_TIMEOUT=120`.

**Index builds are asynchronous.** The CLI returns immediately but Firestore answers
queries with the same error as a missing index while building. Wait and refresh
before assuming failure.

**Firestore rejects single-field composite indexes** as "not necessary". Single-field
ordering is auto-indexed.

**`firebase` is not on PATH.** Use `npx firebase-tools`.

### Scheduled functions

| Function | Time (ET) | Calls |
| --- | --- | --- |
| `dailyEdgarPull` | 07:00 | `/api/cron/edgar` |
| `dailySnapshot` | 08:30 | `/api/cron/snapshot` |
| `dailyAlertCheck` | 09:00 | `/api/signals`, `/api/cycle` |

All `us-central1`, Node 22. `CRON_SECRET` must match across `.env.local`, Vercel and
the Firebase secret; a 401 on a cron route means they drifted.

### Firestore collections

`observations`, `observations_meta`, `initiatives`, `edgar_candidates`, `theses`.
All closed to the client SDK, written only through firebase-admin.

---

## Related

- Notion: Research Desk Operating Manual, Data Store Reference, Build and Deploy
  Reference, under the Skyline Cycle Terminal project page.
- Source memo: Milk Road Show interview with Lucas Chen, VP Research at Galaxy
  Digital, 2026-08-20.
