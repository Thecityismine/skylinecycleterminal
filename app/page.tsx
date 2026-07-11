import Link from "next/link";
import {
  Activity, Waves, Radar, ArrowLeftRight, Layers, LineChart,
  Check, ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Activity,
    title: "Skyline Cycle Score",
    desc: "A single 0–100 read on where BTC sits in the cycle, blending MVRV, Fear & Greed, Pi Cycle, and moving-average structure.",
  },
  {
    icon: LineChart,
    title: "BTC vs GLI Liquidity Lag",
    desc: "Bitcoin price against a composite global liquidity index, shifted forward by a configurable lag — with a live lag optimizer.",
  },
  {
    icon: Radar,
    title: "Liquidity Regime Matrix",
    desc: "Fed balance sheet, DXY, real yields, and stablecoin supply combined into one macro regime read for BTC.",
  },
  {
    icon: ArrowLeftRight,
    title: "ETF Flows & Dominance",
    desc: "Daily spot ETF flow tracking alongside BTC and altcoin dominance shifts across the market.",
  },
  {
    icon: Layers,
    title: "Full On-Chain Suite",
    desc: "SOPR, NUPL, HODL waves, reserve risk, realized price, and more — the on-chain signals that matter, in one place.",
  },
  {
    icon: Waves,
    title: "Halving & Seasonality Models",
    desc: "Historical halving-window overlays, four-year cycle comparison, and monthly seasonality heatmaps.",
  },
];

const INCLUDED = [
  "Every chart and indicator on the terminal",
  "Skyline Cycle Score & macro liquidity models",
  "Full on-chain, price, and market-structure suite",
  "Shareable chart export cards",
  "New charts and models added over time",
];

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: "var(--sct-bg)" }}>
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
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
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
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
          Skyline Cycle Terminal blends on-chain data, macro liquidity, and price structure into
          one dashboard — so you can read where the cycle actually stands, not just where price is.
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Link
            href="/cycle"
            className="flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-md transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14" }}
          >
            Try the Cycle Score Free
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
          No signup required — Cycle Score, Fear &amp; Greed, BTC Price, and the Overview dashboard are free to explore.
        </p>
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
              className="rounded-xl border p-5"
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
          style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-btc)" }}
        >
          <div className="flex items-baseline justify-center gap-1.5 mb-6">
            <span className="text-4xl font-bold" style={{ color: "var(--sct-text)" }}>$99</span>
            <span className="text-sm" style={{ color: "var(--sct-muted)" }}>/ year</span>
          </div>

          <ul className="space-y-2.5 mb-8">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--sct-secondary)" }}>
                <Check size={16} style={{ color: "var(--sct-green)" }} className="shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          <button
            disabled
            className="w-full rounded-md px-5 py-3 text-sm font-semibold cursor-not-allowed"
            style={{ backgroundColor: "var(--sct-border)", color: "var(--sct-muted)" }}
          >
            Subscribe — Coming Soon
          </button>
          <p className="text-[11px] text-center mt-3" style={{ color: "var(--sct-muted)" }}>
            Card, Cash App, and Bitcoin/Lightning payment coming soon. Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--sct-btc)" }}>
              Log in
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 border-t" style={{ borderColor: "var(--sct-border)" }}>
        <p className="text-[11px] text-center" style={{ color: "var(--sct-muted)" }}>
          Skyline Cycle Terminal is provided for informational purposes only and is not financial
          advice. &copy; {new Date().getFullYear()} Skyline Cycle Terminal.
        </p>
      </footer>
    </div>
  );
}
