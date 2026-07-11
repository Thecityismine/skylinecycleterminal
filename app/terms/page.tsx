import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-16" style={{ backgroundColor: "var(--sct-bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--sct-text)" }}>Terms of Service</h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--sct-secondary)" }}>
          Full terms are being finalized. Skyline Cycle Terminal is provided for informational and
          educational purposes only — nothing on this site is financial advice, investment advice,
          or a recommendation to buy or sell any asset.
        </p>
        <Link href="/" className="text-sm" style={{ color: "var(--sct-btc)" }}>&larr; Back to home</Link>
      </div>
    </div>
  );
}
