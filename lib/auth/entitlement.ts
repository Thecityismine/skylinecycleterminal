import "server-only";

// Firestore-backed subscriber entitlement — shared between the read side
// (lib/auth/access.ts's requireAccess() DAL) and the write side
// (app/api/stripe/webhook/route.ts). Both go through firebase-admin, which
// bypasses firestore.rules entirely; the client SDK never touches these
// collections (see firestore.rules).
//
// Schema:
//   users/{uid}.entitlement = { accessExpiresAt: number (ms epoch), plan, updatedAt }
//   stripeCustomers/{stripeCustomerId} = { uid }   — reverse lookup, since
//     subscription webhook events (updated/deleted) only carry the Stripe
//     customer ID, not the Firebase uid.
//
// Active is derived from accessExpiresAt > now at read time rather than
// stored as a separate boolean, so a missed/late webhook fails safe
// (access simply lapses at period end) instead of failing open.

export type EntitlementRecord = {
  accessExpiresAt: number | null;
};

async function getDb() {
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getAdminApp } = await import("@/lib/auth/firebaseAdmin");
  return getFirestore(await getAdminApp());
}

export async function getEntitlementRecord(uid: string): Promise<EntitlementRecord> {
  const db = await getDb();
  const snap = await db.collection("users").doc(uid).get();
  const accessExpiresAt = snap.data()?.entitlement?.accessExpiresAt as number | undefined;
  return { accessExpiresAt: accessExpiresAt ?? null };
}

export async function setEntitlement(
  uid: string,
  fields: { accessExpiresAt: number; stripeCustomerId: string; stripeSubscriptionId: string; plan: string },
): Promise<void> {
  const db = await getDb();
  const { FieldValue } = await import("firebase-admin/firestore");
  await db.collection("users").doc(uid).set(
    {
      stripeCustomerId: fields.stripeCustomerId,
      stripeSubscriptionId: fields.stripeSubscriptionId,
      entitlement: {
        accessExpiresAt: fields.accessExpiresAt,
        plan: fields.plan,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );
}

export async function linkStripeCustomer(stripeCustomerId: string, uid: string): Promise<void> {
  const db = await getDb();
  await db.collection("stripeCustomers").doc(stripeCustomerId).set({ uid });
}

export async function getUidForStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  const db = await getDb();
  const snap = await db.collection("stripeCustomers").doc(stripeCustomerId).get();
  return (snap.data()?.uid as string | undefined) ?? null;
}
