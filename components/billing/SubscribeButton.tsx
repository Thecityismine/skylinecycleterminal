"use client";

import { useState, useCallback } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

type Status = "idle" | "loading" | "error";

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

export function SubscribeButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Single click, no separate login page: if there's no Firebase user yet,
  // signInWithPopup must be the very first await here (not after a fetch) or
  // strict popup blockers treat it as not directly triggered by the click.
  // Already-signed-in visitors skip the popup entirely and go straight to checkout.
  const handleClick = useCallback(async () => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const idToken = auth.currentUser
        ? await auth.currentUser.getIdToken()
        : await signInWithPopup(auth, googleProvider).then((r) => r.user.getIdToken());

      await establishSession(idToken);

      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? "Checkout failed");
      window.location.href = body.url;
    } catch (err) {
      setStatus("error");
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setErrorMsg("Sign-in was cancelled, try again.");
      } else if (code === "auth/popup-blocked") {
        setErrorMsg("Your browser blocked the sign-in popup. Allow popups for this site and try again.");
      } else if (code === "auth/unauthorized-domain") {
        setErrorMsg("This domain isn't authorized for sign-in yet.");
      } else {
        setErrorMsg("Something went wrong starting checkout. Try again in a moment.");
      }
    }
  }, []);

  return (
    <div>
      <button
        onClick={() => void handleClick()}
        disabled={status === "loading"}
        className="w-full inline-block text-sm font-semibold px-5 py-3 rounded-md transition-all"
        style={{
          backgroundColor: "var(--sct-btc)",
          color: "#0A0E14",
          opacity: status === "loading" ? 0.6 : 1,
        }}
      >
        {status === "loading" ? "Redirecting…" : "Continue with Google"}
      </button>
      {status === "error" && errorMsg && (
        <p className="text-xs mt-2" style={{ color: "var(--sct-red)" }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
