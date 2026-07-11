import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/constants";

export type Session = { uid: string; email: string | null };

// Verifies the session cookie against Firebase Admin. Cheap-ish (JWT signature/expiry
// check, revocation check hits Firebase's key cache) — not a Firestore read. Memoized
// per-request via React's cache() so multiple call sites in one render pass share the result.
// firebase-admin is loaded dynamically here — see lib/auth/firebaseAdmin.ts for why.
export const verifySession = cache(async (): Promise<Session | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const { getAdminApp } = await import("@/lib/auth/firebaseAdmin");
    const adminApp = await getAdminApp();
    const decoded = await getAuth(adminApp).verifySessionCookie(cookie, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
});
