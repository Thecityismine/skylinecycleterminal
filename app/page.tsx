import Link from "next/link";
import {
  Activity, Waves, Radar, ArrowLeftRight, Layers, LineChart,
  Check, ArrowRight,
} from "lucide-react";
import { WaitlistModal } from "@/components/landing/WaitlistModal";

const FEATURES = [
  {
    icon: Activity,
    title: "Skyline Cycle Score",
    desc: "A 0–100 cycle reading that blends on-chain, macro, sentiment, and price structure into one actionable market regime.",
  },
  {
    icon: LineChart,
    title: "BTC vs GLI Liquidity Lag",
    desc: "Track Bitcoin against global liquidity using configurable lag models and correlation testing.",
  },
  {
    icon: Radar,
    title: "Liquidity Regime Matrix",
    desc: "Read whether macro conditions are acting as a tailwind or headwind for Bitcoin.",
  },
  {
    icon: ArrowLeftRight,
    title: "ETF Flows & Dominance",
    desc: "Monitor institutional demand, ETF inflows/outflows, stablecoin dominance, and market rotation.",
  },
  {
    icon: Layers,
    title: "Full On-Chain Suite",
    desc: "SOPR, NUPL, HODL waves, realized price, supply in profit, CVDD, and long-term holder behavior.",
  },
  {
    icon: Waves,
    title: "Halving & Seasonality Models",
    desc: "Compare halving cycles, monthly returns, yearly lows, and four-year cycle behavior.",
  },
];

const TOOLS = [
  "Cycle Score", "GLI Liquidity Lag", "ETF Flows", "Stablecoin Dominance",
  "DXY", "SOPR", "HODL Waves", "Halving Models", "Altseason Index",
];

const QUESTIONS_ANSWERED = [
  "Is Bitcoin in accumulation or distribution?",
  "Is liquidity helping or hurting the cycle?",
  "Are long-term holders buying or selling?",
  "Are ETF flows confirming demand?",
  "Is the current cycle early, mid, or late?",
];

const FREE_INCLUDED = [
  "Skyline Cycle Score",
  "BTC price overview",
  "Fear & Greed",
  "Overview dashboard",
];

const PREMIUM_INCLUDED = [
  "Every chart and model",
  "Full on-chain suite",
  "Macro liquidity dashboards",
  "ETF flows and dominance",
  "Shareable chart cards",
  "New models added over time",
];

const FAQS = [
  {
    q: "What is Skyline Cycle Terminal?",
    a: "A Bitcoin and Ethereum cycle analytics dashboard combining on-chain, macro, liquidity, ETF, and price-structure data.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Skyline is an analytics tool for education and market research — not financial advice.",
  },
  {
    q: "Do I need an account to use the free dashboard?",
    a: "No. The free Cycle Score, BTC price, Fear & Greed, and Overview dashboard are available without signup.",
  },
  {
    q: "What does premium include?",
    a: "Premium unlocks the full terminal, including on-chain models, macro liquidity dashboards, ETF flows, share cards, and new charts as they ship.",
  },
];

const waitlistButtonClass =
  "w-full flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02]";
const waitlistButtonStyle: React.CSSProperties = { backgroundColor: "var(--sct-btc)", color: "#0A0E14" };

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: "#070B10" }}>
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto relative z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/skyline-full.png"
          alt="Skyline Cycle Terminal"
          style={{ width: 160, height: "auto", filter: "invert(1) brightness(1.8)", opacity: 0.92 }}
        />
        <nav className="flex items-center gap-6">
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
          Institutional-grade cycle analytics,{" "}
          <span style={{ color: "var(--sct-btc)" }}>without the guesswork.</span>
        </h1>
        <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: "var(--sct-secondary)" }}>
          Skyline Cycle Terminal combines on-chain data, macro liquidity, ETF flows, price
          structure, and cycle models into one clean terminal, helping you see whether Bitcoin is
          in accumulation, expansion, caution, or distribution.
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-md transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14", boxShadow: "0 0 40px rgba(247,147,26,0.15)" }}
          >
            Open Free Dashboard
            <ArrowRight size={16} />
          </Link>
          <a
            href="#pricing"
            className="text-sm font-medium px-5 py-3 rounded-md border transition-colors"
            style={{ borderColor: "var(--sct-border)", color: "var(--sct-text)" }}
          >
            See Pricing
          </a>
        </div>
        <p className="text-xs" style={{ color: "var(--sct-muted)" }}>
          Free dashboard available. No signup required.
        </p>
      </section>

      {/* Hero product preview */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div
          className="rounded-2xl border p-2 sm:p-3"
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
        </div>
      </section>

      {/* Trust row */}
      <section className="max-w-4xl mx-auto px-6 pb-16 text-center">
        <p className="text-sm mb-5" style={{ color: "var(--sct-secondary)" }}>
          Built for Bitcoin cycle investors, macro traders, and long-term allocators.
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
          Built to answer the questions that matter
        </h2>
        <div
          className="rounded-2xl border p-6 sm:p-8 space-y-3"
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
        >
          {QUESTIONS_ANSWERED.map((q) => (
            <div key={q} className="flex items-start gap-3">
              <span
                className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                style={{ backgroundColor: "var(--sct-btc)" }}
              />
              <p className="text-sm sm:text-base" style={{ color: "var(--sct-secondary)" }}>{q}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-16">
        <h2 className="text-2xl font-semibold text-center mb-3" style={{ color: "var(--sct-text)" }}>
          Everything on one terminal
        </h2>
        <p className="text-sm text-center mb-12" style={{ color: "var(--sct-muted)" }}>
          A growing library of charts and models, built for a single purpose: reading the cycle.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5"
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
              <p className="text-xs leading-relaxed" style={{ color: "var(--sct-muted)" }}>
                {f.desc}
              </p>
            </div>
          ))}
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
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--sct-muted)" }}>
              Free
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
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--sct-btc)" }}>
              Premium — $99/yr
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
          <div className="flex items-baseline justify-center gap-1.5 mb-2">
            <span className="text-4xl font-bold" style={{ color: "var(--sct-text)" }}>$99</span>
            <span className="text-sm" style={{ color: "var(--sct-muted)" }}>/ year</span>
          </div>
          <p className="text-xs text-center mb-6" style={{ color: "var(--sct-muted)" }}>
            One simple plan. Every chart. No upsells.
          </p>

          <ul className="space-y-2.5 mb-8">
            {PREMIUM_INCLUDED.concat("Cancel anytime").map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--sct-secondary)" }}>
                <Check size={16} style={{ color: "var(--sct-green)" }} className="shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          <WaitlistModal
            triggerLabel="Join Waitlist"
            triggerClassName={waitlistButtonClass}
            triggerStyle={waitlistButtonStyle}
          />
          <p className="text-[11px] text-center mt-3" style={{ color: "var(--sct-muted)" }}>
            Stripe and Cash App checkout coming soon. Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--sct-btc)" }}>
              Log in
            </Link>
            .
          </p>
        </div>
      </section>

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

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 border-t" style={{ borderColor: "var(--sct-border)" }}>
        <p className="text-[11px] text-center mb-4" style={{ color: "var(--sct-muted)" }}>
          Skyline Cycle Terminal is provided for informational and educational purposes only.
          Nothing on this site is financial advice, investment advice, or a recommendation to buy
          or sell any asset. &copy; {new Date().getFullYear()} Skyline Cycle Terminal.
        </p>
        <div className="flex items-center justify-center gap-5 text-[11px]">
          <Link href="/terms" style={{ color: "var(--sct-muted)" }}>Terms</Link>
          <Link href="/privacy" style={{ color: "var(--sct-muted)" }}>Privacy</Link>
          <Link href="/contact" style={{ color: "var(--sct-muted)" }}>Contact</Link>
        </div>
      </footer>
    </div>
  );
}
