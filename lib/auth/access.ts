import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { verifySession, type Session } from "@/lib/auth/session";
import { getEntitlementRecord } from "@/lib/auth/entitlement";

export type Entitlement = { active: boolean };

// Comma-separated allowlist of emails that always bypass billing entirely (site
// owner/admin access) — checked before any entitlement lookup, and stays relevant
// even after Phase 2/3 wire up real Stripe/crypto enforcement below.
function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// Phase 2: real Firestore-backed entitlement, written by app/api/stripe/webhook/route.ts.
// Active is derived from accessExpiresAt > now rather than trusting a stored boolean, so a
// missed webhook fails safe (access simply lapses at period end) instead of failing open.
// Memoized per-request — requireAccess() and isEntitled() can both run in one render pass.
const getEntitlement = cache(async (uid: string): Promise<Entitlement> => {
  try {
    const { accessExpiresAt } = await getEntitlementRecord(uid);
    return { active: accessExpiresAt != null && accessExpiresAt > Date.now() };
  } catch (err) {
    console.error("[access] entitlement lookup failed:", err);
    return { active: false };
  }
});

// Single choke point for the (protected) route group: redirects to /login if there's no
// valid session, or to /billing if the session is valid but the subscription has lapsed.
export async function requireAccess(): Promise<Session> {
  const session = await verifySession();
  if (!session) redirect("/login");

  if (isAdminEmail(session.email)) return session;

  const entitlement = await getEntitlement(session.uid);
  if (!entitlement.active) redirect("/billing");

  return session;
}

// Guard for admin-only API routes. Unlike requireAccess() this returns a boolean
// rather than redirecting, because an API route needs to answer 403 rather than
// bounce a browser. Being entitled is not enough: a paying subscriber must not
// be able to reach anything gated by this.
export async function isAdmin(): Promise<boolean> {
  const session = await verifySession();
  return isAdminEmail(session?.email ?? null);
}

// Used by the (free) route group to decide whether to still show "FREE" badges in the
// sidebar — true once someone is an admin or has an active entitlement, since those
// badges are only meaningful to visitors who don't have full access yet.
export async function isEntitled(session: Session | null): Promise<boolean> {
  if (!session) return false;
  if (isAdminEmail(session.email)) return true;
  const entitlement = await getEntitlement(session.uid);
  return entitlement.active;
}
