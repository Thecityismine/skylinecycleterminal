# `/learn` + Free Surface — Build Scope

**Date**: 2026-07-27
**Origin**: Tier 2 items #9 and #10 from the [AltIndex competitor profile](../../marketing/competitor-profiles/altindex.md) — AltIndex indexes ~15 free pages, Skyline indexes ~6.
**Verdict**: Split into two phases. Phase 1 (`/learn`) is unblocked and should start now. Phase 2 (opening chart pages) depends on a business decision that has to be made first.

---

## Two findings that change the plan

### Finding 1 — the data APIs have no authentication at all

`proxy.ts`'s matcher excludes `api` entirely, and no data route checks a session. Verified: the only routes touching auth are `auth/*`, `stripe/*`, and `btcpay/*`. `/api/onchain`, `/api/cycle`, `/api/macro`, `/api/etf-flows` and the rest return full data to any unauthenticated caller.

**The paywall is UI-only.** Every premium dashboard's underlying data is already public to anyone who opens devtools or guesses a URL.

This cuts both ways:
- It **removes the main objection** to opening chart pages — you are not giving away anything that is currently protected.
- It also means **"recent window free, full history paid" cannot be enforced** as designed. Slicing data client-side is cosmetic; the full series is one fetch away.

So the teaser-gating pattern I proposed needs a decision before it can be built honestly. See §3.

### Finding 2 — `PUBLIC_PATHS` is an exact-match list

```ts
const isPublic = PUBLIC_PATHS.includes(pathname);
```

Every `/learn/<slug>` would fail this check and redirect to `/login`. This must become prefix-aware before any nested public route can ship. It is a small change but a hard blocker, and it silently breaks the entire content launch if missed.

---

## Phase 1 — `/learn` (unblocked, start here)

### What already exists

`marketing/content/` holds **13 finished articles**, and `marketing/content-hub.md` already defines the full information architecture:

- A pillar (`/learn/how-to-read-the-bitcoin-market-cycle`) with 12 cluster articles beneath it
- Canonical slugs for all 13, all under `/learn/`
- Primary + secondary keywords, meta titles (≤60 chars) and descriptions (≤155 chars) per article
- Internal linking rules — every guide links up to the pillar and sideways to 1–2 siblings
- A standard closer routing back to the Cycle Score, plus the homepage CTA
- "Educational only, not financial advice" on every piece

This is unusually complete. The work is plumbing, not authoring.

### Gaps to close

| Gap | Detail |
|---|---|
| **Content lives outside the deployed app** | `marketing/content/` is in the parent folder; Vercel builds from `skylinecycleterminal/`. Content must move to `skylinecycleterminal/content/learn/`. |
| **Metadata is in HTML comments, not frontmatter** | Each file opens with `<!-- CORNERSTONE GUIDE #5 … Primary keyword: … -->`. Parseable, but fragile. Convert to YAML frontmatter — a mechanical transform across 13 files. |
| **No markdown renderer** | No markdown dependency in `package.json`. Articles use GFM tables and blockquotes, so the renderer needs GFM support. |
| **No `/learn` routes** | Index page and `[slug]` page both need building. |
| **Proxy blocks nested paths** | See Finding 2. |

### Build plan

| # | Task | Files | Size |
|---|---|---|---|
| 1 | Make `PUBLIC_PATHS` prefix-aware; add `/learn` | `proxy.ts` | small |
| 2 | Move 13 articles into the app; convert HTML-comment headers to YAML frontmatter (title, slug, description, keywords, updated) | `content/learn/*.md` | ~half day |
| 3 | Frontmatter + markdown loader (GFM tables required) | new `lib/content/learn.ts` | ~half day |
| 4 | `/learn` index — pillar first, then cluster, grouped as content-hub defines | new `app/learn/page.tsx` | ~half day |
| 5 | `/learn/[slug]` with `generateStaticParams` + `generateMetadata` from frontmatter | new `app/learn/[slug]/page.tsx` | ~half day |
| 6 | Prose styling consistent with the terminal's dark theme | `app/globals.css` or a scoped component | ~half day |
| 7 | `BlogPosting` + `BreadcrumbList` JSON-LD per article | `[slug]` page | small |
| 8 | Sitemap: add `/learn` and all 13 slugs, generated from the content index so it can't drift | `app/sitemap.ts` | small |
| 9 | Cross-linking: nav link, footer, and links from `/cycle` and `/track-record` into the relevant guides | several | ~half day |

Roughly **2–3 days**.

**Renderer recommendation**: `marked` — small, fast, GFM tables built in, and it renders to an HTML string on the server so no markdown parser ships to the client. The content is first-party and trusted, so a full sanitizer is not strictly required, but run one anyway if any of it later becomes user-editable.

**Route placement**: `app/learn/` — deliberately *outside* both `(free)` and `(protected)`. Articles should not render inside the dashboard chrome (sidebar + header); they need a clean, wide reading layout with its own header and a strong CTA back into the product.

---

## Phase 2 — opening chart pages (needs a decision first)

The question is not which pages to open. It is what the paywall is actually for, given Finding 1.

**Option A — Accept UI-only gating.** Open 8–10 high-intent chart pages fully. The data was never protected anyway, so nothing is lost; premium's value becomes the terminal experience, Deep Research, and having everything in one place rather than exclusive access to numbers. Fastest, and honest about what the product already is.

**Option B — Add real entitlement first.** Put session + entitlement checks on the data APIs, then build genuine teaser gating (recent window free, full history behind auth). Larger job: every data route needs a check, every client fetch needs to handle 401, and the free pages that legitimately need data (`/cycle`, `/dashboard`, `/track-record`) need an allowlist. Meaningfully more work, and it makes the site slower to crawl.

**Recommendation: Option A**, for now. The stated goal of this workstream is discovery, and Option A serves it immediately. Option B is a real consideration but it is a pricing-model question, not an SEO one, and bundling them delays both.

**Candidate pages if Option A** (high search intent, currently `(protected)`): Fear & Greed *(already free)*, halving cycles, power law, drawdown from ATH, altseason, 2-year MA, Pi Cycle bottom, realized price, hash ribbons, Bitcoin dominance.

---

## Sequencing

1. **Phase 1 now** — zero dependency on the paywall question.
2. **Decide A or B** while Phase 1 is in flight.
3. **Phase 2 after** — mechanical once the decision is made.

## Phase 1 — implementation status (shipped 2026-07-27)

| Piece | File |
|---|---|
| Prefix-aware public routing | `proxy.ts` (`PUBLIC_PREFIXES`) |
| **14** articles migrated with YAML frontmatter | `content/learn/*.md` |
| Frontmatter + markdown loader, related-article logic | `lib/content/learn.ts` (new) |
| Reading layout, outside dashboard chrome | `app/learn/layout.tsx` (new) |
| Index — pillar first, then cluster | `app/learn/page.tsx` (new) |
| Article route, SSG via `generateStaticParams` | `app/learn/[slug]/page.tsx` (new) |
| Prose styling scoped to `.learn-prose` | `app/globals.css` |
| Sitemap generated from the content index | `app/sitemap.ts` |
| Nav + footer links | `app/page.tsx` |

Build: **92 pages, exit 0** (up from 77). All 14 guides prerendered. Sitemap carries 25 URLs including all 14 guides. Anonymous request to `/learn/<slug>` returns 200, confirming the proxy fix.

**It is 14 articles, not 13** — the earlier count in this doc and the competitor profile was wrong.

Decisions taken during the build:
- **Dropped `gray-matter`.** It pulls `js-yaml@3.x`, which carries a high-severity advisory. Since this repo emits the frontmatter itself, `lib/content/learn.ts` uses a strict parser for that known format instead. `marked` (GFM, server-side) is the only dependency added. If frontmatter ever needs to accept arbitrary author YAML, swap in a real parser rather than extending the strict one.
- **Guides render outside `(free)`/`(protected)`** — no sidebar. A reader from search wants an article; the route back into the product is the CTA.
- Titles opt out of the root layout's `%s · Skyline Cycle Terminal` template, since `metaTitle` already ends in `| Skyline`.

Still open from Phase 1:
- **Staged publishing.** All 14 went live at once. A `draft` frontmatter flag filtered in `getAllArticles()` would be a small change if a phased rollout is preferred.

## Phase 2 — implementation status (shipped 2026-07-27, Option A)

Ten high-intent chart pages moved from `app/(protected)/` to `app/(free)/`. Route groups don't affect URLs, so every path is unchanged and no inbound link breaks.

| Opened | Opened |
|---|---|
| `/price/halving-cycles` | `/price/hash-ribbons` |
| `/price/power-law` | `/price/two-year-ma` |
| `/price/drawdown` | `/altseason` |
| `/price/pi-cycle-bottom` | `/dominance` |
| `/price/realized-price` | `/onchain/sopr` |

Three places had to move together, and they are easy to desync — `proxy.ts` now carries a comment saying so:
1. `PUBLIC_PATHS` in `proxy.ts`
2. `PUBLIC_PAGES` in `app/sitemap.ts`
3. `free: true` in `components/layout/Sidebar.tsx` (drives the green FREE badge)

`/dominance`'s query-string siblings (`?asset=eth`, `?view=total`) were also badged — they resolve to the same now-public route, so leaving them unbadged would have been a fresh inconsistency.

Verified: all 10 return 200 to an unauthenticated request and render their charts; `/onchain`, `/etf-flows` and `/dominance/stablecoins` still 307 to `/login`; sitemap carries 35 URLs including all 10; 17 FREE badges render in the sidebar. Build clean, 92 pages, exit 0.

**Indexable public pages: ~6 → ~31.**

### Build environment notes

Two non-code problems surfaced repeatedly and cost real time:

1. **Stale dev route validators.** `tsconfig.json` includes `.next/dev/types/**/*.ts` (Next 16 scaffolding). Adding or removing a route leaves that generated `validator.ts` pointing at paths that no longer exist, and `next build` does not regenerate it — so the production typecheck fails with `Cannot find module '../../app/(protected)/…/page.js'`. Fix: delete `.next/dev/types`. This bit twice: once moving pages between route groups, and again after removing the BTCPay routes. Expect it after any route change.

2. **Dropbox locking — resolved, and the obvious fix does not work.** EBUSY/EPERM on `.next` paths, landing on a different directory each run, and at one point corrupting the dev server's manifests badly enough that two pages served 500 until a restart. Compilation, TypeScript and all 92 pages succeeded every time; only cleanup failed.

   The first attempt at a fix extended `scripts/dropbox-ignore.mjs` to pre-create and mark the `.next` subdirectories, on the theory that the build would then write into folders Dropbox already ignored. **That does not work**, and it is recorded here because it is the obvious thing to reach for. Measured with a harness that writes an export-shaped tree, waits 2s and removes it — 10 iterations each:

   | Setup | Failures |
   |---|---|
   | Inside Dropbox, unmarked | 5/10 |
   | Inside Dropbox, marked ignored | 5/6 |
   | Outside Dropbox | 0/10 |
   | Inside Dropbox, via junction | 0/10 |

   Marking tells Dropbox not to *sync* a folder; it does not stop Dropbox opening a handle on it first. Narrowing the race was an illusion produced by a single passing build.

   The shipped fix redirects `.next` out of the Dropbox tree via an NTFS directory junction into `%LOCALAPPDATA%`. Next still sees `.next` inside the project — `distDir` requires that — but the files live where Dropbox never looks. The container is keyed by a hash of the project path so worktrees don't share a build directory, and carries a junction back to `node_modules`, without which code running from the redirected output resolves modules beside its real path and fails on `@tailwindcss/postcss`. `node_modules` itself keeps the ignore marker, where the goal is stopping the upload rather than the handle. Marking survives as the fallback when a junction can't be created.

   None of this affects Vercel — the script no-ops on CI.

## Risks

- **Content-to-code drift.** `content-hub.md` becomes a second source of truth once articles live in the app. Move it in alongside them, or have the index page generate from frontmatter and delete the duplicate table.
- **Thin-content penalty.** Thirteen articles landing on one day looks like a content dump. Consider publishing the pillar plus 4–5 first, then the rest over following weeks.
- **The phase table in the articles doesn't match the product.** Articles say "Accumulation / Build / Caution / Distribution"; `ZONE_CONFIG` says "Accumulate / Hold / Build / Caution / Distribution Risk". Reconcile before publishing — the whole positioning rests on figures and labels being checkable.
- **`/api` is unauthenticated.** Worth a separate decision regardless of this workstream. Not urgent for SEO; is a business-model question.
