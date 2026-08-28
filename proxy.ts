import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { isDevAuthBypassEnabled } from "@/lib/auth/devBypass";

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
  // Reached only from an email link, by someone who is very likely not signed in.
  // Kept out of the sitemap deliberately — it is noindex and carries an address.
  "/unsubscribe",
  // Crawler/metadata file-convention routes — must stay reachable without a session
  // The manifest belongs here for the same reason: the browser requests it with
  // no session, got redirected to /login, and then failed parsing the HTML of the
  // sign-in page as JSON.
  "/robots.txt", "/sitemap.xml", "/manifest.webmanifest",
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

  // Local-only, triple-gated — see lib/auth/devBypass.ts. Deliberately only opens
  // the gate; it does NOT feed the signed-in redirect below, so "/" still renders
  // the landing page locally instead of bouncing to /dashboard.
  const devBypass = isDevAuthBypassEnabled();

  if (!isPublic && !hasSession && !devBypass) {
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
