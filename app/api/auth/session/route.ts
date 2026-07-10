import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import adminApp from "@/lib/auth/firebaseAdmin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/constants";

// Exchanges a short-lived Firebase ID token (from the client SDK) for a long-lived,
// httpOnly session cookie. Called right after client-side sign-in completes.
export async function POST(req: Request) {
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const auth = getAuth(adminApp);
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
  } catch {
    return NextResponse.json({ error: "Invalid or expired sign-in" }, { status: 401 });
  }
}
