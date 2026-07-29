import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { getAllArticles, getPillar } from "@/lib/content/learn";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";

const TITLE = "Bitcoin Cycle Guides";
const DESCRIPTION =
  "Plain-English guides to reading the Bitcoin market cycle: tops, bottoms, macro liquidity, on-chain signals, and where the cycle stands.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/learn" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/learn", type: "website" },
};

export default function LearnIndexPage() {
  const pillar = getPillar();
  const cluster = getAllArticles().filter((a) => !a.pillar);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    hasPart: getAllArticles().map((a) => ({
      "@type": "Article",
      headline: a.title,
      description: a.description,
      url: `/learn/${a.slug}`,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <p
        className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-widest uppercase px-3 py-1 rounded-full border mb-6"
        style={{ borderColor: "var(--sct-border)", color: "var(--sct-btc)" }}
      >
        <BookOpen size={12} />
        Skyline Guides
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4" style={{ color: "var(--sct-text)" }}>
        Read the cycle.
      </h1>
      <p className="text-base max-w-2xl mb-12" style={{ color: "var(--sct-secondary)" }}>
        No hype, no price calls. These guides explain how Bitcoin&apos;s cycle actually works: what
        marks a top, what marks a bottom, and how liquidity, on-chain data, and market structure fit
        together.
      </p>

      {/* Pillar gets its own treatment — it is the entry point for the cluster. */}
      {pillar && (
        <Link
          href={`/learn/${pillar.slug}`}
          className="group block rounded-2xl border p-6 sm:p-8 mb-10 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: "var(--sct-card)",
            borderColor: "rgba(247,147,26,0.35)",
            boxShadow: "0 0 60px rgba(247,147,26,0.06)",
          }}
        >
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2" style={{ color: "var(--sct-btc)" }}>
            Start here
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
            {pillar.title}
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--sct-muted)" }}>
            {pillar.description}
          </p>
          <span
            className="inline-flex items-center gap-1.5 text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--sct-btc)" }}
          >
            Read the guide
            <ArrowRight size={14} />
          </span>
        </Link>
      )}

      <h2 className="text-sm font-medium tracking-wider uppercase mb-5" style={{ color: "var(--sct-muted)" }}>
        Every guide
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cluster.map((a) => (
          <Link
            key={a.slug}
            href={`/learn/${a.slug}`}
            className="group rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 block"
            style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
          >
            <p className="text-base font-semibold mb-1.5" style={{ color: "var(--sct-text)" }}>
              {a.title}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--sct-muted)" }}>
              {a.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-12">
        <NewsletterSignup source="learn-index" />
      </div>

      <div
        className="rounded-2xl border p-6 sm:p-8 mt-6 text-center"
        style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
      >
        <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
          Or just check where the cycle is right now.
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--sct-muted)" }}>
          The Skyline Cycle Score reads every signal in these guides into one number. Free, no signup.
        </p>
        <Link
          href="/cycle"
          className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-md"
          style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14" }}
        >
          See today&apos;s Cycle Score
          <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
