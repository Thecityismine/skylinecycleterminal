// Zero-dependency constants shared between proxy.ts (must never import
// firebase-admin — it runs on every request, including public pages) and the
// server-only DAL in lib/auth/session.ts.
export const SESSION_COOKIE = "sct_session";
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days — Admin SDK's hard cap
