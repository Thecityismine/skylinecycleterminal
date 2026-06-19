"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  History,
  Bitcoin,
  Layers,
  LineChart,
  Zap,
  Cpu,
  Network,
  Users,
  PieChart,
  BarChart2,
  DollarSign,
  Landmark,
  Waves,
  ExternalLink,
  BookOpen,
  CalendarDays,
  BarChart3,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
};

type NavSection = {
  section: string;
  items: NavItem[];
};

const nav: (NavItem | NavSection)[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard, exact: true },
  {
    section: "CYCLE",
    items: [
      { label: "Skyline Score", href: "/cycle", icon: Activity },
      { label: "Cycle Model", href: "/cycle#model", icon: TrendingUp },
      { label: "Historical Peaks", href: "/cycle#history", icon: History },
    ],
  },
  {
    section: "PRICE",
    items: [
      { label: "BTC / USD", href: "/price", icon: Bitcoin, exact: true },
      { label: "ETH / USD", href: "/price?asset=eth", icon: Layers, exact: true },
      { label: "4-Year Cycle", href: "/price/four-year-cycle", icon: CalendarDays },
      { label: "2-Year MA", href: "/price/two-year-ma", icon: BarChart3 },
      { label: "Moving Averages", href: "/price?view=ma", icon: LineChart, exact: true },
    ],
  },
  {
    section: "ON-CHAIN",
    items: [
      { label: "MVRV Z-Score", href: "/onchain", icon: Zap },
      { label: "Puell Multiple", href: "/onchain?metric=puell", icon: Cpu },
      { label: "NVT Signal", href: "/onchain?metric=nvt", icon: Network },
      { label: "Active Addresses", href: "/onchain?metric=addresses", icon: Users },
    ],
  },
  {
    section: "MARKET STRUCTURE",
    items: [
      { label: "BTC Dominance", href: "/dominance", icon: PieChart },
      { label: "ETH Dominance", href: "/dominance?asset=eth", icon: PieChart },
      { label: "Total Market Cap", href: "/dominance?view=total", icon: BarChart2 },
    ],
  },
  {
    section: "MACRO",
    items: [
      { label: "DXY", href: "/macro", icon: DollarSign },
      { label: "Fed Funds Rate", href: "/macro?chart=fed", icon: Landmark },
      { label: "CPI / Inflation", href: "/macro?chart=cpi", icon: TrendingUp },
      { label: "M2 Liquidity", href: "/macro?chart=m2", icon: Waves },
      { label: "10Y Yield", href: "/macro?chart=yield", icon: LineChart },
    ],
  },
  {
    section: "TOOLS",
    items: [
      { label: "External Links", href: "/links", icon: ExternalLink },
      { label: "Methodology", href: "/methodology", icon: BookOpen },
    ],
  },
];

function isSection(entry: NavItem | NavSection): entry is NavSection {
  return "section" in entry;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const hrefBase = item.href.split("?")[0].split("#")[0];

  const active =
    hrefBase === "/"
      ? pathname === "/"
      : item.exact
      ? pathname === hrefBase
      : pathname === hrefBase || pathname.startsWith(hrefBase + "/");

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all duration-150 group relative",
        active
          ? "text-[var(--sct-text)] bg-[var(--sct-card)]"
          : "text-[var(--sct-muted)] hover:text-[var(--sct-secondary)] hover:bg-[var(--sct-card)]/50"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-btc" />
      )}
      <item.icon
        size={14}
        className={cn(
          "shrink-0 transition-colors",
          active
            ? "text-btc"
            : "text-[var(--sct-muted)] group-hover:text-[var(--sct-secondary)]"
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[260px] z-40 flex flex-col border-r overflow-hidden"
      style={{
        backgroundColor: "var(--sct-panel)",
        borderColor: "var(--sct-border)",
      }}
    >
      {/* Brand */}
      <div
        className="h-16 flex items-center px-5 border-b shrink-0"
        style={{ borderColor: "var(--sct-border)" }}
      >
        <div>
          <p className="text-sm font-semibold tracking-widest text-[var(--sct-text)] font-mono uppercase">
            SKYLINE
          </p>
          <p className="text-[10px] tracking-wider" style={{ color: "var(--sct-muted)" }}>
            CYCLE TERMINAL
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.map((entry, i) => {
          if (isSection(entry)) {
            return (
              <div key={entry.section} className={i > 0 ? "pt-4" : ""}>
                <p
                  className="px-3 pb-1.5 text-[10px] font-medium tracking-widest uppercase"
                  style={{ color: "var(--sct-muted)" }}
                >
                  {entry.section}
                </p>
                <div className="space-y-0.5">
                  {entry.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </div>
              </div>
            );
          }

          return <NavLink key={entry.href} item={entry} pathname={pathname} />;
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-3 border-t text-[10px] shrink-0"
        style={{ borderColor: "var(--sct-border)", color: "var(--sct-muted)" }}
      >
        <p>Data: CoinGecko · CoinMetrics · FRED</p>
        <p className="mt-0.5 opacity-60">v0.1.0 — skeleton</p>
      </div>
    </aside>
  );
}
