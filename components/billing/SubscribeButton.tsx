"use client";

import { useState, useCallback } from "react";

type Status = "idle" | "loading" | "error";

export function SubscribeButton() {
  const [status, setStatus] = useState<Status>("idle");

  const handleClick = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/login?next=/billing";
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? "Checkout failed");
      window.location.href = body.url;
    } catch {
      setStatus("error");
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
        {status === "loading" ? "Redirecting to checkout…" : "Subscribe — $99/year"}
      </button>
      {status === "error" && (
        <p className="text-xs mt-2" style={{ color: "var(--sct-red)" }}>
          Something went wrong starting checkout — try again in a moment.
        </p>
      )}
    </div>
  );
}
