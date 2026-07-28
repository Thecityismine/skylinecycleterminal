import Link from "next/link";
import {
  Activity, Waves, Radar, ArrowLeftRight, Layers, LineChart,
  Check, ArrowRight, FileText,
} from "lucide-react";
import { SubscribeButton } from "@/components/billing/SubscribeButton";
import { CycleScoreHero } from "@/components/landing/CycleScoreHero";
import { ProofBar } from "@/components/landing/ProofBar";
import { Testimonials } from "@/components/landing/Testimonials";
import { DeepResearchPreview } from "@/components/landing/DeepResearchPreview";

const FEATURES = [
  {
    icon: Activity,
    title: "Skyline Cycle Score",
    desc: "One number that tells you where Bitcoin sits in the four-year cycle.",
    href: "/cycle",
  },
  {
    icon: LineChart,
    title: "BTC vs GLI Liquidity Lag",
    desc: "See how global liquidity leads Bitcoin by weeks or months.",
    href: "/macro/gli",
  },
  {
    icon: Radar,
    title: "Liquidity Regime Matrix",
    desc: "Instantly know whether macro conditions are a tailwind or headwind.",
    href: "/macro/liquidity-regime",
  },
  {
    icon: ArrowLeftRight,
    title: "ETF Flows & Dominance",
    desc: "Track daily institutional ETF demand, inflows/outflows, and dominance shifts.",
    href: "/etf-flows",
  },
  {
    icon: Layers,
    title: "Full On-Chain Suite",
    desc: "Every major on-chain signal: SOPR, NUPL, HODL waves, realized price, and more.",
    href: "/onchain",
  },
  {
    icon: Waves,
    title: "Halving & Seasonality Models",
    desc: "Compare every Bitcoin halving cycle since 2012, plus monthly and yearly patterns.",
    href: "/price/halving-cycles",
  },
];

const TOOLS = [
  "Cycle Score", "GLI Liquidity Lag", "ETF Flows", "Stablecoin Dominance",
  "DXY", "SOPR", "HODL Waves", "Halving Models", "Altseason Index",
];

const QUESTIONS_ANSWERED = [
  "Are we in accumulation or distribution?",
  "Is liquidity supporting higher prices?",
  "Are institutions actually buying?",
  "Are long-term holders accumulating or distributing?",
  "How much risk is left in this cycle?",
];

const FREE_INCLUDED = [
  "Skyline Cycle Score",
  "BTC price overview",
  "Fear & Greed",
  "4-Year Cycle",
  "Overview dashboard",
];

const PREMIUM_INCLUDED = [
  "Skyline Deep Research report",
  "Every chart and model",
  "Full on-chain suite",
  "Macro liquidity dashboards",
  "ETF flows and dominance",
  "Shareable chart cards",
  "New models added over time",
];

// Mirrors the real structure of the report at /research — the transparency
// ledger is the differentiator, so the landing page shows it rather than
// describing it.
const RESEARCH_SECTIONS = [
  "Executive summary",
  "Why this conclusion",
  "Indicator dashboard",
  "Historical cycle comparison",
  "Positional weights",
  "What changed this week",
  "Most similar historical period",
  "What would invalidate this",
  "Data gaps",
];

const FAQS = [
  {
    q: "What is Skyline Cycle Terminal?",
    a: "A Bitcoin & Ethereum macro intelligence platform that combines on-chain data, liquidity, ETF flows, market structure, and cycle models into one dashboard.",
  },
  {
    q: "Who is Skyline for?",
    a: "Long-term Bitcoin investors, macro traders, and anyone trying to understand where Bitcoin sits in its four-year cycle, not day traders looking for entry signals.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Skyline provides market analytics and historical cycle models to inform your own research, not financial, investment, or trading advice.",
  },
  {
    q: "Do I need an account to use the free dashboard?",
    a: "No. The free Cycle Score, BTC price, Fear & Greed, and Overview dashboard are available without signup.",
  },
  {
    q: "How often is data updated?",
    a: "Cycle signals move in weeks and months, not seconds, so the cadence matches the data. BTC/ETH prices and dominance update throughout the day; on-chain and macro dashboards refresh daily, as their source data does. Nothing here is built for tick-by-tick trading.",
  },
  {
    q: "What does premium include?",
    a: "Premium unlocks the full terminal, including on-chain models, macro liquidity dashboards, ETF flows, share cards, and new charts as they ship.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. Cancel anytime before your renewal date and you won't be charged again.",
  },
];

// Specifics, not adjectives. Every line here is something a subscriber can go
// and check inside the terminal — which is the point, and the contrast against
// competitors quoting win rates and round user counts.
const PROOF_POINTS = [
  "The Cycle Score is a weighted read of 11 independent indicators: Pi Cycle, MVRV, Puell Multiple, 2-year MA, power law, NVT, Fear & Greed, active addresses, stablecoin supply, hash ribbons, and Reserve Risk",
  "Every indicator is percentile-ranked against Bitcoin's full price history back to 2012, so a reading is scored against its own distribution rather than a threshold someone picked",
  "Covers all four halving cycles: 2012, 2016, 2020, and 2024",
  "Indicators that can't be computed are shown as gaps, not quietly dropped from the average",
  "50+ models and dashboards, from ETF flows and global liquidity to HODL waves and altseason",
];

// Built from the same FAQS array the page renders, so the structured data can
// never drift from the visible copy. Feeds Google rich results and gives AI
// search engines a clean question/answer pair to cite.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: "#070B10" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto relative z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/skyline-full.png"
          alt="Skyline Cycle Terminal"
          style={{ width: 160, height: "auto", filter: "invert(1) brightness(1.8)", opacity: 0.92 }}
        />
        <nav className="flex items-center gap-6">
          <Link href="/learn" className="hidden sm:inline text-sm" style={{ color: "var(--sct-secondary)" }}>
            Guides
          </Link>
          <Link href="/track-record" className="hidden sm:inline text-sm" style={{ color: "var(--sct-secondary)" }}>
            Track record
          </Link>
          <a href="#features" className="hidden sm:inline text-sm" style={{ color: "var(--sct-secondary)" }}>
            Features
          </a>
          <a href="#pricing" className="hidden sm:inline text-sm" style={{ color: "var(--sct-secondary)" }}>
            Pricing
          </a>
          <a href="#faq" className="hidden sm:inline text-sm" style={{ color: "var(--sct-secondary)" }}>
            FAQ
          </a>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-md border transition-colors"
            style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
          >
            Login
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section
        className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center relative"
        style={{
          backgroundImage:
            "radial-gradient(circle at top center, rgba(247,147,26,0.10), transparent 45%)",
        }}
      >
        <p
          className="inline-block text-[11px] font-medium tracking-widest uppercase px-3 py-1 rounded-full border mb-6"
          style={{ borderColor: "var(--sct-border)", color: "var(--sct-btc)" }}
        >
          Bitcoin &amp; Ethereum Macro Cycle Intelligence
        </p>
        <h1
          className="text-4xl sm:text-5xl font-semibold tracking-tight mb-5"
          style={{ color: "var(--sct-text)" }}
        >
          Stop reacting to Bitcoin.{" "}
          <span style={{ color: "var(--sct-btc)" }}>Start reading the cycle.</span>
        </h1>
        <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: "var(--sct-secondary)" }}>
          One dashboard for on-chain, macro liquidity, ETF flows, and historical cycle models —
          so you know when to accumulate, when to wait, and when to reduce risk.
        </p>
        <CycleScoreHero />
        <div className="flex items-center justify-center gap-3 mb-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-md transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14", boxShadow: "0 0 40px rgba(247,147,26,0.15)" }}
          >
            Start Free
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/cycle"
            className="text-sm font-medium px-5 py-3 rounded-md border transition-colors"
            style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
          >
            See today&apos;s full read
          </Link>
        </div>
        {/* Disqualification does more for trust than another benefit claim, and
            it is the sharpest line of separation from signal-selling tools. */}
        <p className="text-xs max-w-md mx-auto" style={{ color: "var(--sct-muted)" }}>
          Free dashboard, no signup. Built for investors thinking in cycles — if you want entry
          signals for tomorrow, this isn&apos;t it.
        </p>
      </section>

      {/* Hero product preview */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div
          className="relative rounded-2xl border p-2 sm:p-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.02)",
            borderColor: "rgba(247,147,26,0.25)",
            boxShadow: "0 0 80px rgba(247,147,26,0.10)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-dashboard-preview.png"
            alt="Skyline Cycle Terminal dashboard preview showing live BTC/ETH prices and the Skyline Cycle Score"
            className="w-full rounded-xl"
          />
          {/* Floating callouts — hidden on small screens where the image is too
              compressed for them to land on the right spot */}
          {[
            { label: "Cycle Score", top: "47%", left: "3%" },
            { label: "Live Market Data", top: "2.5%", left: "42%" },
            { label: "Macro Score", top: "89%", left: "76%" },
          ].map((c) => (
            <span
              key={c.label}
              className="hidden md:inline-flex items-center gap-1.5 absolute px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap backdrop-blur-sm"
              style={{
                top: c.top,
                left: c.left,
                backgroundColor: "rgba(9,13,19,0.85)",
                border: "1px solid rgba(247,147,26,0.4)",
                color: "var(--sct-btc)",
              }}
            >
              <Check size={11} />
              {c.label}
            </span>
          ))}
        </div>
      </section>

      <ProofBar />

      {/* Trust row */}
      <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold mb-3" style={{ color: "var(--sct-text)" }}>
          Designed for investors who think in years, not days.
        </h2>
        <p className="text-sm max-w-xl mx-auto mb-5" style={{ color: "var(--sct-secondary)" }}>
          Whether you&apos;re stacking Bitcoin every paycheck or managing a seven-figure portfolio,
          Skyline helps you separate short-term noise from long-term opportunity.
        </p>
        <p className="text-xs font-medium tracking-wide mb-6" style={{ color: "var(--sct-muted)" }}>
          No hype. No price calls. Just cycle data.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TOOLS.map((tool) => (
            <span
              key={tool}
              className="px-3 py-1 rounded-full text-[11px] font-mono border"
              style={{ borderColor: "var(--sct-border)", color: "var(--sct-muted)" }}
            >
              {tool}
            </span>
          ))}
        </div>
      </section>

      {/* What Skyline helps you answer */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-center mb-8" style={{ color: "var(--sct-text)" }}>
          Every chart answers one question.
        </h2>
        <div
          className="rounded-2xl border p-6 sm:p-8 space-y-3"
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
        >
          {QUESTIONS_ANSWERED.map((q) => (
            <div key={q} className="flex items-start gap-3">
              <Check size={16} style={{ color: "var(--sct-btc)" }} className="shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base" style={{ color: "var(--sct-secondary)" }}>{q}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deep Research — moved above the feature grid: it is the differentiator,
          and it was previously sitting below a generic list of capabilities. */}
      <section id="research" className="max-w-6xl mx-auto px-6 py-20 sm:py-24 scroll-mt-16">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border"
            style={{ color: "var(--sct-btc)", borderColor: "rgba(247,147,26,0.3)", backgroundColor: "rgba(247,147,26,0.08)" }}
          >
            <FileText size={13} />
            Skyline Deep Research
          </span>
        </div>
        <h2
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-4 max-w-3xl mx-auto"
          style={{ color: "var(--sct-text)" }}
        >
          The charts give you the data. This tells you what it adds up to.
        </h2>
        <p className="text-sm sm:text-base text-center max-w-2xl mx-auto mb-12" style={{ color: "var(--sct-muted)" }}>
          Every model on the terminal is read into a single research report — the kind an institutional desk
          publishes. It states a position, shows the evidence on both sides, and tells you what would prove it wrong.
        </p>

        {/* Live preview — runs the same evidence engine the report itself uses */}
        <DeepResearchPreview />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div
            className="rounded-xl border p-6 lg:col-span-2"
            style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
          >
            <p className="text-base font-semibold mb-1.5" style={{ color: "var(--sct-text)" }}>
              What&apos;s in every report
            </p>
            <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--sct-muted)" }}>
              Rebuilt from live data each time you open it. Print or save as PDF.
            </p>
            <div className="flex flex-wrap gap-2">
              {RESEARCH_SECTIONS.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2.5 py-1.5 rounded border"
                  style={{ color: "var(--sct-secondary)", borderColor: "var(--sct-border)" }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border p-6"
            style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
          >
            <p className="text-base font-semibold mb-2" style={{ color: "var(--sct-text)" }}>
              Probabilities, never predictions.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--sct-muted)" }}>
              Deep Research reports where the evidence sits and how confident that reading is. It does not forecast
              price, and it does not tell you what to buy. Data first, opinion second.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-16">
        <h2 className="text-2xl font-semibold text-center mb-3" style={{ color: "var(--sct-text)" }}>
          Everything on one terminal
        </h2>
        <p className="text-sm text-center mb-12" style={{ color: "var(--sct-muted)" }}>
          50+ Bitcoin &amp; Ethereum models in one place.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 block"
              style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: "rgba(247,147,26,0.12)" }}
              >
                <f.icon size={18} style={{ color: "var(--sct-btc)" }} />
              </div>
              <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--sct-text)" }}>
                {f.title}
              </p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--sct-muted)" }}>
                {f.desc}
              </p>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--sct-btc)" }}
              >
                View live
                <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Proof / why investors use Skyline */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-center mb-8" style={{ color: "var(--sct-text)" }}>
          Why investors use Skyline
        </h2>
        <div
          className="rounded-2xl border p-6 sm:p-8 space-y-3"
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
        >
          {PROOF_POINTS.map((p) => (
            <div key={p} className="flex items-start gap-3">
              <Check size={16} style={{ color: "var(--sct-green)" }} className="shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base" style={{ color: "var(--sct-secondary)" }}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Track record — the numbers here are the point-in-time readings served by
          /api/track-record. They only move if CYCLE_ANCHORS or the history start
          date change; if either does, update this copy with them. */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div
          className="rounded-2xl border p-6 sm:p-8"
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
        >
          <h2 className="text-2xl font-semibold mb-3" style={{ color: "var(--sct-text)" }}>
            Here is where the score was wrong.
          </h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--sct-secondary)" }}>
            Across the last three Bitcoin cycles, the Cycle Score read Accumulate at all three cycle
            bottoms and Distribution Risk at the 2017 top. At the 2021 top it reached only 68 —
            Caution, not Distribution Risk. That is a miss, and it is published alongside the hits,
            computed point-in-time so no reading uses data from after its own date.
          </p>
          <Link
            href="/track-record"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: "var(--sct-btc)" }}
          >
            See the full track record
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Free vs Premium */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-center mb-3" style={{ color: "var(--sct-text)" }}>
          Free vs. Premium
        </h2>
        <p className="text-sm text-center mb-10" style={{ color: "var(--sct-muted)" }}>
          Try the core product free. Upgrade for the full terminal.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}>
            <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "var(--sct-muted)" }}>
              Free
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--sct-muted)" }}>
              Perfect for checking Bitcoin&apos;s current cycle position.
            </p>
            <ul className="space-y-2.5">
              {FREE_INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--sct-secondary)" }}>
                  <Check size={16} style={{ color: "var(--sct-muted)" }} className="shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-btc)" }}>
            <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "var(--sct-btc)" }}>
              Premium: $99/yr
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--sct-muted)" }}>
              Everything you need to make long-term allocation decisions.
            </p>
            <ul className="space-y-2.5">
              {PREMIUM_INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--sct-secondary)" }}>
                  <Check size={16} style={{ color: "var(--sct-green)" }} className="shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-2xl mx-auto px-6 py-16 scroll-mt-16">
        <h2 className="text-2xl font-semibold text-center mb-3" style={{ color: "var(--sct-text)" }}>
          Simple, yearly access
        </h2>
        <p className="text-sm text-center mb-10" style={{ color: "var(--sct-muted)" }}>
          One plan. Every chart. Cancel anytime.
        </p>

        <div
          className="rounded-2xl border p-8"
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-btc)", boxShadow: "0 0 60px rgba(247,147,26,0.08)" }}
        >
          <div className="flex items-baseline justify-center gap-1.5 mb-1">
            <span className="text-4xl font-bold" style={{ color: "var(--sct-text)" }}>$99</span>
            <span className="text-sm" style={{ color: "var(--sct-muted)" }}>/ year</span>
          </div>
          <p className="text-xs text-center mb-1" style={{ color: "var(--sct-secondary)" }}>
            Less than $9/month.
          </p>
          <p className="text-xs text-center mb-6" style={{ color: "var(--sct-muted)" }}>
            Billed once a year. Cancel anytime.
          </p>

          <ul className="space-y-2.5 mb-8">
            {PREMIUM_INCLUDED.concat("Cancel anytime").map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--sct-secondary)" }}>
                <Check size={16} style={{ color: "var(--sct-green)" }} className="shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          <SubscribeButton />

          <p className="text-[11px] text-center mt-3" style={{ color: "var(--sct-muted)" }}>
            Card or Cash App via Stripe. Already have an account?{" "}
            <Link href="/login?next=/billing" style={{ color: "var(--sct-btc)" }}>
              Log in
            </Link>
          </p>
        </div>
      </section>

      <Testimonials />

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-16 scroll-mt-16">
        <h2 className="text-2xl font-semibold text-center mb-10" style={{ color: "var(--sct-text)" }}>
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {FAQS.map((item) => (
            <div key={item.q} className="rounded-xl border p-5" style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--sct-text)" }}>{item.q}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--sct-muted)" }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section
        className="max-w-3xl mx-auto px-6 py-16 text-center relative"
        style={{
          backgroundImage:
            "radial-gradient(circle at bottom center, rgba(247,147,26,0.08), transparent 50%)",
        }}
      >
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3" style={{ color: "var(--sct-text)" }}>
          Stop guessing where Bitcoin is.
        </h2>
        <p className="text-sm sm:text-base mb-8" style={{ color: "var(--sct-secondary)" }}>
          Know where the cycle stands before making your next move.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-md transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14", boxShadow: "0 0 40px rgba(247,147,26,0.15)" }}
        >
          Start Free
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 border-t" style={{ borderColor: "var(--sct-border)" }}>
        <p className="text-[11px] text-center mb-4" style={{ color: "var(--sct-muted)" }}>
          Skyline Cycle Terminal is provided for informational and educational purposes only.
          Nothing on this site is financial advice, investment advice, or a recommendation to buy
          or sell any asset. &copy; {new Date().getFullYear()} Skyline Cycle Terminal.
        </p>
        <div className="flex items-center justify-center gap-5 text-[11px]">
          <Link href="/learn" style={{ color: "var(--sct-muted)" }}>Guides</Link>
          <Link href="/track-record" style={{ color: "var(--sct-muted)" }}>Track record</Link>
          <Link href="/terms" style={{ color: "var(--sct-muted)" }}>Terms</Link>
          <Link href="/privacy" style={{ color: "var(--sct-muted)" }}>Privacy</Link>
          <Link href="/contact" style={{ color: "var(--sct-muted)" }}>Contact</Link>
        </div>
      </footer>
    </div>
  );
}
