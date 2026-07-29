import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getAllArticles, getArticle, getPillar, getRelated } from "@/lib/content/learn";
import { NewsletterSignup } from "@/components/marketing/NewsletterSignup";

const SITE_URL = "https://skylinecycleterminal.com";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  const url = `/learn/${article.slug}`;
  return {
    // metaTitle already carries the "| Skyline" suffix, so opt out of the
    // root layout's title template rather than doubling it.
    title: { absolute: article.metaTitle },
    description: article.description,
    keywords: [article.keyword, ...article.secondary],
    alternates: { canonical: url },
    openGraph: {
      title: article.metaTitle,
      description: article.description,
      url,
      type: "article",
      modifiedTime: article.updated,
    },
  };
}

export default async function LearnArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const pillar = getPillar();
  const related = getRelated(slug);
  const url = `${SITE_URL}/learn/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: article.title,
        description: article.description,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        dateModified: article.updated,
        author: { "@type": "Organization", name: "Skyline Cycle Terminal", url: SITE_URL },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Guides", item: `${SITE_URL}/learn` },
          { "@type": "ListItem", position: 2, name: article.title, item: url },
        ],
      },
    ],
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-xs mb-8"
        style={{ color: "var(--sct-muted)" }}
      >
        <ArrowLeft size={13} />
        All guides
      </Link>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4" style={{ color: "var(--sct-text)" }}>
        {article.title}
      </h1>
      <p className="text-xs mb-10 pb-8" style={{ color: "var(--sct-muted)", borderBottom: "1px solid var(--sct-border)" }}>
        {article.readingMinutes} min read · Educational only, not financial advice
      </p>

      {/* Content is first-party markdown authored in this repo, rendered at build
          time — not user input. If that ever changes, sanitize before injecting. */}
      <article className="learn-prose" dangerouslySetInnerHTML={{ __html: article.html }} />

      {/* Standard closer from marketing/content-hub.md — every guide routes back
          to the Score rather than ending on an individual indicator. */}
      <div
        className="rounded-2xl border p-6 sm:p-8 mt-14 text-center"
        style={{ backgroundColor: "var(--sct-card)", borderColor: "rgba(247,147,26,0.3)" }}
      >
        <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
          See where the cycle stands today.
        </h2>
        <p className="text-sm mb-5 max-w-lg mx-auto" style={{ color: "var(--sct-muted)" }}>
          Rather than tracking each of these signals separately, Skyline reads them into the Skyline
          Cycle Score: one view of where Bitcoin sits in its long-term cycle. Free, no signup.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/cycle"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-md"
            style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14" }}
          >
            See today&apos;s Cycle Score
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/track-record"
            className="text-sm font-medium px-5 py-3 rounded-md border"
            style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
          >
            How it read past cycles
          </Link>
        </div>
      </div>

      {/* Capture sits between the closer and the next-reads: someone who
          finished the guide is the most likely subscriber they will ever be,
          and `source` records which guide earned it. */}
      <div className="mt-12">
        <NewsletterSignup source={`learn:${article.slug}`} />
      </div>

      {/* Up to the pillar, sideways to siblings — the content-hub linking rule. */}
      <nav className="mt-12">
        <h2 className="text-sm font-medium tracking-wider uppercase mb-4" style={{ color: "var(--sct-muted)" }}>
          Keep reading
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pillar && pillar.slug !== article.slug && (
            <Link
              href={`/learn/${pillar.slug}`}
              className="rounded-xl border p-4 block"
              style={{ backgroundColor: "var(--sct-card)", borderColor: "rgba(247,147,26,0.3)" }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--sct-btc)" }}>
                Start here
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--sct-text)" }}>{pillar.title}</p>
            </Link>
          )}
          {related.map((r) => (
            <Link
              key={r.slug}
              href={`/learn/${r.slug}`}
              className="rounded-xl border p-4 block"
              style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--sct-muted)" }}>
                Related
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--sct-text)" }}>{r.title}</p>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
