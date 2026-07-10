import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";

// Server-only Firebase Admin singleton — parallel to the client SDK in lib/firebase.ts.
// Requires a service account (Firebase Console → Project Settings → Service Accounts →
// Generate new private key), never exposed to the client (no NEXT_PUBLIC_ prefix).

function buildAdminApp(): App {
  const projectId  = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin env vars not set (FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY)"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const adminApp = getApps().length ? getApp() : buildAdminApp();

export default adminApp;
