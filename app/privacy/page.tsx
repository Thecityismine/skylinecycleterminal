import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-16" style={{ backgroundColor: "var(--sct-bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--sct-text)" }}>Privacy Policy</h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--sct-secondary)" }}>
          Full policy is being finalized. In short: we collect the minimum needed to run your
          account (email, sign-in provider) and never sell your data to third parties.
        </p>
        <Link href="/" className="text-sm" style={{ color: "var(--sct-btc)" }}>&larr; Back to home</Link>
      </div>
    </div>
  );
}
