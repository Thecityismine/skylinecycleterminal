import Link from "next/link";

// Reached when a signed-in user has no active entitlement (requireAccess() redirects here
// instead of /login — they're authenticated, just not subscribed/renewed).
export default function BillingPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 text-center"
      style={{ backgroundColor: "var(--sct-bg)" }}
    >
      <div className="max-w-sm">
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
          No active subscription
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--sct-muted)" }}>
          Your account doesn&apos;t have an active Skyline subscription yet.
        </p>
        <Link
          href="/#pricing"
          className="inline-block text-sm font-semibold px-5 py-3 rounded-md"
          style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14" }}
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
