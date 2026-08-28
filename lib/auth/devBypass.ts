// Local-development-only auth bypass.
//
// WHY THIS EXISTS
// Almost every page in this app sits behind requireAccess(), which needs a real
// Firebase session. That makes local UI work on those pages — responsive layout
// checks, chart rendering, anything visual — impossible to verify without signing
// in through a live Firebase project. This lets a developer render the protected
// route group locally against a synthetic session.
//
// It grants NO data access. Firestore reads still go through firestore.rules with
// whatever credentials the server actually holds; this only stops requireAccess()
// from redirecting. Anything that genuinely needs a real uid will fail, and should.
//
// WHY IT CANNOT REACH PRODUCTION
// Three independent conditions must all hold. Any one of them failing disables it,
// so no single mistake — a stray env var, a wrong build flag — is enough to turn
// it on where it matters:
//
//   1. NODE_ENV !== 'production'   `next build` and `next start` both set production,
//                                  so a production build is inert even with the flag.
//   2. !VERCEL                     Vercel sets this on every deployment, preview and
//                                  production alike. Belt to the NODE_ENV braces.
//   3. DEV_AUTH_BYPASS === '1'     Explicit opt-in. Absent by default, so a fresh
//                                  clone and `npm run dev` is still fully gated.
//
// Setting DEV_AUTH_BYPASS=1 in Vercel's dashboard would therefore still do nothing.
//
// HOW TO USE IT
// Add to .env.local (which is gitignored, so it never travels):
//
//     DEV_AUTH_BYPASS=1
//
// Restart the dev server. Remove the line, or set it to 0, to restore normal gating.
//
// The synthetic email deliberately is NOT in ADMIN_EMAILS — admin-gated routes stay
// gated, so this cannot be used to preview admin surfaces.

export const DEV_AUTH_BYPASS_EMAIL = 'dev-bypass@localhost.invalid';
export const DEV_AUTH_BYPASS_UID   = 'dev-bypass-uid';

export function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    !process.env.VERCEL &&
    process.env.DEV_AUTH_BYPASS === '1'
  );
}
