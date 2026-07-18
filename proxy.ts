import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Optimistic cookie-presence check only — no JWT verification, no Firestore read.
// Proxy runs on every request including prefetches, so it stays cheap; the real
// verify + entitlement check happens in app/(protected)/layout.tsx's requireAccess().
const PUBLIC_PATHS = [
  "/", "/login", "/billing", "/terms", "/privacy", "/contact",
  // Free-tier pages — app/(free)/... — viewable without signing in or paying
  "/dashboard", "/cycle", "/price", "/price/fear-greed",
  // Crawler/metadata file-convention routes — must stay reachable without a session
  "/robots.txt", "/sitemap.xml",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
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
