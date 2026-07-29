"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

// Inline email capture for Skyline Weekly. Deliberately not a modal: a reader
// who has just finished a guide should be able to subscribe without an
// interruption, and the editorial calendar treats the weekly email as the
// engine rather than an upsell.
//
// `source` is stored with the address so the Sunday review can tell which page
// or guide actually earns subscribers.

type Status = "idle" | "submitting" | "done" | "error";

export function NewsletterSignup({
  source,
  variant = "section",
  heading = "Get the weekly cycle read",
  blurb = "One email each Sunday: the current Cycle Score, what changed, and one thing worth understanding. No hype, no price calls.",
}: {
  source: string;
  variant?: "section" | "compact";
  heading?: string;
  blurb?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // The form renders immediately and is removed only once the visitor is
  // confirmed signed in. Waiting for the check before rendering would have been
  // tidier for signed-in users, but it withholds the form from everyone until a
  // round-trip completes and then injects it mid-page — a layout shift paid by
  // the logged-out majority to spare a brief flash for the minority. Wrong trade.
  //
  // The pages hosting this are statically generated, which is why the check
  // happens client-side rather than in the server component.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((d: { signedIn?: boolean }) => {
        if (!cancelled) setSignedIn(d.signedIn === true);
      })
      // If the check fails, show the form — a missed signup is worse than showing
      // it to someone already signed in.
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (signedIn === true) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  // Footer variant: one line and a field, no card. Its job is to be reachable
  // from the bottom of any page rather than to make the argument again.
  if (variant === "compact") {
    if (status === "done") {
      return (
        <p className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--sct-green)" }}>
          <Check size={14} />
          Subscribed. Check your inbox.
        </p>
      );
    }
    return (
      <div className="text-center">
        <p className="text-xs mb-3" style={{ color: "var(--sct-muted)" }}>
          {heading}. One email each Sunday.
        </p>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="flex-1 rounded-md px-3 py-2 text-xs border bg-transparent outline-none"
            style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-md px-4 py-2 text-xs font-semibold shrink-0"
            style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14", opacity: status === "submitting" ? 0.6 : 1 }}
          >
            {status === "submitting" ? "…" : "Subscribe"}
          </button>
        </form>
        {status === "error" && (
          <p className="text-[11px] mt-2" style={{ color: "var(--sct-red)" }}>
            Something went wrong. Try again in a moment.
          </p>
        )}
      </div>
    );
  }

  return (
    <section
      className="rounded-2xl border p-6 sm:p-8"
      style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
    >
      {status === "done" ? (
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(53,208,127,0.15)" }}
          >
            <Check size={16} style={{ color: "var(--sct-green)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--sct-text)" }}>
              You&apos;re subscribed
            </p>
            <p className="text-xs" style={{ color: "var(--sct-muted)" }}>
              Check your inbox. A short welcome is on its way, and the first digest lands Sunday.
            </p>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
            {heading}
          </h2>
          <p className="text-sm leading-relaxed mb-5 max-w-xl" style={{ color: "var(--sct-muted)" }}>
            {blurb}
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col sm:flex-row gap-2.5 max-w-lg">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="flex-1 rounded-md px-3.5 py-2.5 text-sm border bg-transparent outline-none"
              style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold shrink-0"
              style={{
                backgroundColor: "var(--sct-btc)",
                color: "#0A0E14",
                opacity: status === "submitting" ? 0.6 : 1,
              }}
            >
              {status === "submitting" ? "Subscribing…" : "Subscribe"}
              {status !== "submitting" && <ArrowRight size={15} />}
            </button>
          </form>

          {status === "error" && (
            <p className="text-xs mt-2.5" style={{ color: "var(--sct-red)" }}>
              Something went wrong. Try again in a moment.
            </p>
          )}

          <p className="text-[11px] mt-3" style={{ color: "var(--sct-muted)" }}>
            Free. Unsubscribe any time. Educational only, not financial advice.
          </p>
        </>
      )}
    </section>
  );
}
