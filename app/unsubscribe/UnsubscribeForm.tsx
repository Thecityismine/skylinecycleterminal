"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

// A confirm step rather than unsubscribing on page load: link scanners in
// corporate mail gateways follow every URL in a message, and a GET that mutates
// state would unsubscribe people who never clicked. One-click from the mail
// client is handled separately, by POST to /api/unsubscribe.

type Status = "idle" | "submitting" | "done" | "error";

export function UnsubscribeForm({ email, token }: { email: string; token: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleUnsubscribe() {
    setStatus("submitting");
    try {
      const res = await fetch(
        `/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (!email || !token) {
    return (
      <>
        <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
          This link looks incomplete
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--sct-muted)" }}>
          Use the unsubscribe link at the foot of any Skyline email, or reply to one and we&apos;ll
          take you off the list by hand.
        </p>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--sct-btc)" }}>
          Back to Skyline
          <ArrowRight size={14} />
        </Link>
      </>
    );
  }

  if (status === "done") {
    return (
      <>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(53,208,127,0.15)" }}
        >
          <Check size={18} style={{ color: "var(--sct-green)" }} />
        </div>
        <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
          You&apos;re unsubscribed
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--sct-muted)" }}>
          {email} won&apos;t receive Skyline Weekly again. The terminal stays free to use — nothing
          about your access changes.
        </p>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--sct-btc)" }}>
          Back to Skyline
          <ArrowRight size={14} />
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
        Unsubscribe from Skyline Weekly?
      </h1>
      <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--sct-muted)" }}>
        This stops the Sunday email to <strong style={{ color: "var(--sct-text)" }}>{email}</strong>.
        It does not affect your account or your access to the terminal.
      </p>

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => void handleUnsubscribe()}
          disabled={status === "submitting"}
          className="rounded-md px-4 py-2.5 text-sm font-semibold"
          style={{
            backgroundColor: "var(--sct-btc)",
            color: "#0A0E14",
            opacity: status === "submitting" ? 0.6 : 1,
          }}
        >
          {status === "submitting" ? "Unsubscribing…" : "Yes, unsubscribe"}
        </button>
        <Link
          href="/"
          className="rounded-md px-4 py-2.5 text-sm font-medium border"
          style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
        >
          Keep me subscribed
        </Link>
      </div>

      {status === "error" && (
        <p className="text-xs mt-3" style={{ color: "var(--sct-red)" }}>
          Something went wrong — try again in a moment, or reply to any Skyline email.
        </p>
      )}
    </>
  );
}
