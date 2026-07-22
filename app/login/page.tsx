"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signInWithPopup,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

const EMAIL_STORAGE_KEY = "sct_email_for_signin";

async function establishSession(idToken: string) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Failed to establish session (HTTP ${res.status})`);
  }
}

type Status = "idle" | "working" | "sent" | "error";

// Only allow same-site relative paths — a bare "/foo", never "//host" or
// "https://host" — so the ?next= param (attacker-controllable) can't be used
// to redirect a freshly-authenticated user off-site after sign-in.
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Complete an email-link sign-in if this page was opened from the magic link
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    (async () => {
      setStatus("working");
      let storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
      if (!storedEmail) {
        storedEmail = window.prompt("Confirm your email to complete sign-in");
      }
      if (!storedEmail) {
        setStatus("error");
        setErrorMsg("Email confirmation is required to complete sign-in.");
        return;
      }
      try {
        const result = await signInWithEmailLink(auth, storedEmail, window.location.href);
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        const idToken = await result.user.getIdToken();
        await establishSession(idToken);
        router.push(next);
      } catch {
        setStatus("error");
        setErrorMsg("That sign-in link is invalid or has expired. Request a new one below.");
      }
    })();
  }, [router, next]);

  const handleGoogleSignIn = useCallback(async () => {
    setStatus("working");
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await establishSession(idToken);
      router.push(next);
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setStatus("error");
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setErrorMsg("Sign-in was cancelled — try again.");
      } else if (code === "auth/popup-blocked") {
        setErrorMsg("Your browser blocked the sign-in popup. Allow popups for this site and try again.");
      } else if (code === "auth/unauthorized-domain") {
        setErrorMsg("This domain isn't authorized for Google sign-in yet.");
      } else if (code) {
        setErrorMsg(`Google sign-in failed (${code}). Try again.`);
      } else {
        const message = err instanceof Error ? err.message : "Try again.";
        setErrorMsg(`Google sign-in failed: ${message}`);
      }
    }
  }, [router, next]);

  const handleEmailLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      setStatus("working");
      setErrorMsg(null);
      try {
        await sendSignInLinkToEmail(auth, email, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: true,
        });
        window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
        setStatus("sent");
      } catch (err) {
        console.error("sendSignInLinkToEmail failed:", err);
        setStatus("error");
        const code = (err as { code?: string })?.code;
        if (code === "auth/operation-not-allowed") {
          setErrorMsg("Email link sign-in isn't enabled for this project yet.");
        } else if (code === "auth/unauthorized-continue-uri" || code === "auth/invalid-continue-uri") {
          setErrorMsg("This domain isn't authorized for sign-in links yet.");
        } else if (code === "auth/invalid-email") {
          setErrorMsg("That email address doesn't look valid.");
        } else {
          setErrorMsg(`Couldn't send the sign-in link${code ? ` (${code})` : ""}. Try again.`);
        }
      }
    },
    [email],
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--sct-bg)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/skyline-full.png"
              alt="Skyline Cycle Terminal"
              style={{ width: 180, height: "auto", filter: "invert(1) brightness(1.8)", opacity: 0.92 }}
            />
          </Link>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
        >
          <p className="text-lg font-semibold text-center mb-1" style={{ color: "var(--sct-text)" }}>
            Sign in
          </p>
          <p className="text-xs text-center mb-6" style={{ color: "var(--sct-muted)" }}>
            Access requires an active Skyline subscription
          </p>

          {status === "sent" ? (
            <p className="text-sm text-center" style={{ color: "var(--sct-green)" }}>
              Check your inbox — we sent a sign-in link to {email}.
            </p>
          ) : (
            <>
              <button
                onClick={() => void handleGoogleSignIn()}
                disabled={status === "working"}
                className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium border transition-all"
                style={{
                  backgroundColor: "var(--sct-text)",
                  color: "#0A0E14",
                  borderColor: "var(--sct-text)",
                  opacity: status === "working" ? 0.6 : 1,
                }}
              >
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--sct-border)" }} />
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--sct-muted)" }}>
                  or
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--sct-border)" }} />
              </div>

              <p className="text-xs mb-3" style={{ color: "var(--sct-muted)" }}>
                {next === "/billing"
                  ? "Enter your email to receive a secure checkout link."
                  : "Enter your email to receive a secure sign-in link."}
              </p>

              <form onSubmit={(e) => void handleEmailLink(e)} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md px-3 py-2.5 text-sm border bg-transparent outline-none"
                  style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
                />
                <button
                  type="submit"
                  disabled={status === "working"}
                  className="w-full rounded-md px-4 py-2.5 text-sm font-medium border transition-all"
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "var(--sct-btc)",
                    color: "var(--sct-btc)",
                    opacity: status === "working" ? 0.6 : 1,
                  }}
                >
                  Email me a sign-in link
                </button>
              </form>

              {errorMsg && (
                <p className="text-xs text-center mt-4" style={{ color: "var(--sct-red)" }}>
                  {errorMsg}
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: "var(--sct-muted)" }}>
          <Link href="/" style={{ color: "var(--sct-muted)" }}>
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
