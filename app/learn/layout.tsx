import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Guides render outside both (free) and (protected): no sidebar, no dashboard
// chrome. A reader arriving from search wants an article, not a terminal — the
// route back into the product is the CTA, not a nav rail.
export default function LearnLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#070B10" }}>
      <header className="border-b" style={{ borderColor: "var(--sct-border)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/skyline-full.png"
              alt="Skyline Cycle Terminal"
              style={{ width: 140, height: "auto", filter: "invert(1) brightness(1.8)", opacity: 0.92 }}
            />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/learn" className="hidden sm:inline" style={{ color: "var(--sct-secondary)" }}>
              Guides
            </Link>
            <Link href="/track-record" className="hidden sm:inline" style={{ color: "var(--sct-secondary)" }}>
              Track record
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 font-semibold px-3.5 py-2 rounded-md"
              style={{ backgroundColor: "var(--sct-btc)", color: "#0A0E14" }}
            >
              Open the terminal
              <ArrowRight size={14} />
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t mt-20" style={{ borderColor: "var(--sct-border)" }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <p className="text-[11px] text-center mb-4" style={{ color: "var(--sct-muted)" }}>
            Skyline Cycle Terminal is provided for informational and educational purposes only.
            Nothing here is financial advice, investment advice, or a recommendation to buy or sell
            any asset. &copy; {new Date().getFullYear()} Skyline Cycle Terminal.
          </p>
          <div className="flex items-center justify-center gap-5 text-[11px]">
            <Link href="/" style={{ color: "var(--sct-muted)" }}>Home</Link>
            <Link href="/learn" style={{ color: "var(--sct-muted)" }}>Guides</Link>
            <Link href="/terms" style={{ color: "var(--sct-muted)" }}>Terms</Link>
            <Link href="/privacy" style={{ color: "var(--sct-muted)" }}>Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
