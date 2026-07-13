import type { MetadataRoute } from "next";

const SITE_URL = "https://skylinecycleterminal.com";

// Only the routes that are actually public without signing in (see PUBLIC_PATHS
// in proxy.ts) — no point indexing /login or /billing.
const PUBLIC_PAGES = ["/", "/dashboard", "/cycle", "/price", "/price/fear-greed", "/terms", "/privacy", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));
}
