import "server-only";
import { redirect } from "next/navigation";
import { verifySession, type Session } from "@/lib/auth/session";

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

// Phase 1: every authenticated user is entitled — there's no payment flow yet, so the
// Firestore `entitlement.accessExpiresAt` check described in the plan doesn't apply until
// Phase 2 starts writing that field. Swap this out for a real `firebase-admin` Firestore
// read (users/{uid}.entitlement.accessExpiresAt > now) when Stripe/crypto billing lands.
async function getEntitlement(_uid: string): Promise<Entitlement> {
  return { active: true };
}

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
