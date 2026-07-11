import type { App } from "firebase-admin/app";

// Server-only Firebase Admin singleton — parallel to the client SDK in lib/firebase.ts.
// Requires a service account (Firebase Console → Project Settings → Service Accounts →
// Generate new private key), never exposed to the client (no NEXT_PUBLIC_ prefix).
//
// Loaded via dynamic import rather than a static top-level import: firebase-admin's
// transitive deps trip up Next/Turbopack's build-time "collect page data" analysis pass
// (fails trying to bundle a `node:crypto` reference for an edge-flavored probe bundle,
// regardless of `serverExternalPackages`/`runtime` segment config). Deferring the actual
// module load to first real invocation keeps it out of that static analysis entirely.

let cachedApp: App | null = null;

export async function getAdminApp(): Promise<App> {
  if (cachedApp) return cachedApp;

  const { initializeApp, getApps, getApp, cert } = await import("firebase-admin/app");

  if (getApps().length) {
    cachedApp = getApp();
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin env vars not set (FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY)"
    );
  }

  cachedApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return cachedApp;
}
