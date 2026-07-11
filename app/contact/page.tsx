import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen px-6 py-16" style={{ backgroundColor: "var(--sct-bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--sct-text)" }}>Contact</h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--sct-secondary)" }}>
          Questions, feedback, or support requests — reach out and we&apos;ll get back to you.
          A dedicated contact form is coming soon.
        </p>
        <Link href="/" className="text-sm" style={{ color: "var(--sct-btc)" }}>&larr; Back to home</Link>
      </div>
    </div>
  );
}
