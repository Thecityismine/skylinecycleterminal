"use client";

import { useState } from "react";
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
  heading = "Get the weekly cycle read",
  blurb = "One email each Sunday: the current Cycle Score, what changed, and one thing worth understanding. No hype, no price calls.",
}: {
  source: string;
  heading?: string;
  blurb?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

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
              Check your inbox — a short welcome is on its way. The first digest lands Sunday.
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
              Something went wrong — try again in a moment.
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
