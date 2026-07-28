import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Optimistic cookie-presence check only — no JWT verification, no Firestore read.
// Proxy runs on every request including prefetches, so it stays cheap; the real
// verify + entitlement check happens in app/(protected)/layout.tsx's requireAccess().
const PUBLIC_PATHS = [
  "/", "/login", "/billing", "/terms", "/privacy", "/contact",
  // Free-tier pages — app/(free)/... — viewable without signing in or paying.
  // Keep this in sync with the `free: true` flags in components/layout/Sidebar.tsx
  // and PUBLIC_PAGES in app/sitemap.ts.
  //
  // Deliberately a short list. Ten chart pages were opened here for organic
  // reach and then rolled back: sixteen FREE badges in the sidebar made premium
  // look thin, which costs more than the extra indexed pages were worth.
  // /learn and /track-record carry the top-of-funnel job instead — they are
  // marketing surfaces rather than terminal features.
  "/dashboard", "/cycle", "/price", "/price/fear-greed", "/track-record",
  // Crawler/metadata file-convention routes — must stay reachable without a session
  "/robots.txt", "/sitemap.xml",
];

// Public sub-trees. PUBLIC_PATHS is an exact-match list, so anything with child
// routes (/learn/<slug>) has to be declared here or every article silently
// redirects to /login.
const PUBLIC_PREFIXES = ["/learn"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|skyline-full.png|skyline-icon.png|.*\\.png$|.*\\.svg$).*)",
  ],
};
