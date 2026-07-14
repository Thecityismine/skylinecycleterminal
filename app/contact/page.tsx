"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type Status = "idle" | "submitting" | "done" | "error";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [name, email, message]);

  return (
    <div className="min-h-screen px-6 py-16" style={{ backgroundColor: "var(--sct-bg)" }}>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--sct-text)" }}>Contact</h1>

        {status === "done" ? (
          <div className="rounded-xl border p-6 text-center" style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: "rgba(53,208,127,0.15)" }}
            >
              <Check size={20} style={{ color: "var(--sct-green)" }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--sct-text)" }}>Message sent</p>
            <p className="text-xs" style={{ color: "var(--sct-muted)" }}>
              Thanks for reaching out — we&apos;ll get back to you by email.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--sct-secondary)" }}>
              Questions, feedback, or support requests — send a message below, or email{" "}
              <a href="mailto:support@skylinecycleterminal.com" style={{ color: "var(--sct-btc)" }}>
                support@skylinecycleterminal.com
              </a>{" "}
              directly.
            </p>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              <input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md px-3 py-2.5 text-sm border bg-transparent outline-none"
                style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
              />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md px-3 py-2.5 text-sm border bg-transparent outline-none"
                style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
              />
              <textarea
                required
                placeholder="How can we help?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-md px-3 py-2.5 text-sm border bg-transparent outline-none resize-none"
                style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
              />

              {status === "error" && (
                <p className="text-xs" style={{ color: "var(--sct-red)" }}>
                  Something went wrong — try again in a moment.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: "var(--sct-btc)",
                  color: "#0A0E14",
                  opacity: status === "submitting" ? 0.6 : 1,
                }}
              >
                {status === "submitting" ? "Sending…" : "Send message"}
              </button>
            </form>
          </>
        )}

        <p className="text-xs mt-6">
          <Link href="/" style={{ color: "var(--sct-muted)" }}>&larr; Back to home</Link>
        </p>
      </div>
    </div>
  );
}
