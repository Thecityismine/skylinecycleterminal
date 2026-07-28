import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/content/learn";

const SITE_URL = "https://skylinecycleterminal.com";

// Only the routes that are actually public without signing in (see PUBLIC_PATHS
// and PUBLIC_PREFIXES in proxy.ts) — no point indexing /login or /billing.
const PUBLIC_PAGES = [
  "/", "/dashboard", "/cycle", "/track-record", "/learn",
  "/price", "/price/fear-greed",
  // High-intent chart pages opened for organic discovery
  "/price/halving-cycles", "/price/power-law", "/price/drawdown", "/price/two-year-ma",
  "/price/pi-cycle-bottom", "/price/realized-price", "/price/hash-ribbons",
  "/altseason", "/dominance", "/onchain/sopr",
  "/terms", "/privacy", "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Guides are derived from content/learn rather than listed by hand, so adding
  // an article can never leave the sitemap stale.
  const guides = getAllArticles().map((a) => ({
    url: `${SITE_URL}/learn/${a.slug}`,
    lastModified: a.updated ? new Date(a.updated) : now,
  }));

  return [
    ...PUBLIC_PAGES.map((path) => ({ url: `${SITE_URL}${path}`, lastModified: now })),
    ...guides,
  ];
}
