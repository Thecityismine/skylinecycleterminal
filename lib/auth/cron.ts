import "server-only";
import { timingSafeEqual } from "node:crypto";
import { isAdmin } from "@/lib/auth/access";

// Authorisation for scheduled jobs.
//
// The admin guard in lib/auth/access.ts is session-based, which a scheduler has
// no way to satisfy. Cron routes therefore accept either:
//
//   Authorization: Bearer <CRON_SECRET>   the scheduler
//   an admin session                      a human triggering a run by hand
//
// The bearer form is the convention both Vercel Cron and the Firebase scheduled
// function in functions/src/index.ts can produce, so one check covers both.
//
// Fails closed: with CRON_SECRET unset, the bearer path is refused outright
// rather than treated as "no secret required". An unset secret in production
// would otherwise leave a write endpoint open to anyone who guessed the path.

function secretMatches(provided: string): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isCronAuthorised(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (bearer && secretMatches(bearer)) return true;

  // Falls through to the session check so an admin can run a job from a browser.
  return isAdmin();
}
