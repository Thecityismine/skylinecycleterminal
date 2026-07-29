import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/constants";

// Cookie-presence only, deliberately: this is a UI hint so statically generated
// pages can hide things a signed-in visitor does not need, not an authorization
// check. Nothing is gated on it — the real verification stays in requireAccess()
// and verifySession(), which validate the cookie against Firebase.
//
// Exists so /learn can stay statically generated. Checking the session in those
// server components would opt all 14 guides into dynamic rendering, and they are
// the SEO surface where fast, cacheable HTML matters most.
export async function GET() {
  const hasCookie = (await cookies()).has(SESSION_COOKIE);
  return NextResponse.json(
    { signedIn: hasCookie },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

// Exchanges a short-lived Firebase ID token (from the client SDK) for a long-lived,
// httpOnly session cookie. Called right after client-side sign-in completes.
// firebase-admin is loaded dynamically — see lib/auth/firebaseAdmin.ts for why.
export async function POST(req: Request) {
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const { getAdminApp } = await import("@/lib/auth/firebaseAdmin");
    const auth = getAuth(await getAdminApp());
    await auth.verifyIdToken(idToken); // reject before minting a cookie from garbage input
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return res;
  } catch (err) {
    console.error("Failed to establish session:", err);
    const message = err instanceof Error ? err.message : "Invalid or expired sign-in";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
