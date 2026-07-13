"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Check } from "lucide-react";

type PaymentMethod = "card" | "cashapp";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "cashapp", label: "Cash App" },
];

type Status = "idle" | "submitting" | "done" | "error";

export function WaitlistModal({ triggerClassName, triggerStyle, triggerLabel }: {
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName} style={triggerStyle}>
        {triggerLabel}
      </button>
      {open && <Modal onClose={() => setOpen(false)} />}
    </>
  );
}

function Modal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, paymentMethod: method }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [name, email, method]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdrop}
    >
      <div
        className="rounded-xl border shadow-2xl w-full max-w-sm"
        style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--sct-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--sct-text)" }}>Join the Waitlist</p>
          <button onClick={onClose} className="rounded-md p-1" style={{ color: "var(--sct-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {status === "done" ? (
            <div className="text-center py-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: "rgba(53,208,127,0.15)" }}
              >
                <Check size={20} style={{ color: "var(--sct-green)" }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--sct-text)" }}>You&apos;re on the list</p>
              <p className="text-xs" style={{ color: "var(--sct-muted)" }}>
                We&apos;ll email you the moment checkout opens.
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              <p className="text-xs mb-1" style={{ color: "var(--sct-muted)" }}>
                Get notified the moment $99/year checkout opens — no charge today.
              </p>
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
              <div>
                <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--sct-muted)" }}>
                  Preferred payment method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMethod(opt.value)}
                      className="px-3 py-1.5 rounded-md text-xs font-mono border transition-colors"
                      style={{
                        backgroundColor: method === opt.value ? "rgba(247,147,26,0.12)" : "transparent",
                        borderColor: method === opt.value ? "var(--sct-btc)" : "var(--sct-border)",
                        color: method === opt.value ? "var(--sct-btc)" : "var(--sct-muted)",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

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
                {status === "submitting" ? "Joining…" : "Join Waitlist"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
