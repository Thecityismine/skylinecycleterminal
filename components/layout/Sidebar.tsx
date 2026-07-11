"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
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
  CircleDollarSign,
  ShieldCheck,
  Radar,
  Scale,
  TrendingDown,
  Briefcase,
  Flame,
  Lock,
  Crosshair,
  ArrowLeftRight,
  Timer,
  Rocket,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  free?: boolean;
};

type NavSection = {
  section: string;
  items: NavItem[];
};

const nav: (NavItem | NavSection)[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true, free: true },
  {
    section: "CYCLE",
    items: [
      { label: "Road to $1M",      href: "/road-to-1m",     icon: Rocket },
      { label: "Skyline Score",    href: "/cycle",          icon: Activity, free: true },
      { label: "Cycle Model",      href: "/cycle#model",    icon: TrendingUp },
      { label: "Historical Peaks",   href: "/cycle#history",         icon: History },
      { label: "Halving Cycles",    href: "/price/halving-cycles",  icon: CalendarDays },
      { label: "Halving Windows",   href: "/price/halving-windows", icon: Crosshair },
      { label: "Benner Cycle",      href: "/price/benner-cycle",    icon: History },
      { label: "Cycle Comparison",  href: "/price/cycle-comparison", icon: Layers },
      { label: "Cycle Timer",       href: "/cycle-timer",            icon: Timer },
      { label: "Crypto Calendar",   href: "/price/calendar",         icon: CalendarDays },
    ],
  },
  {
    section: "PRICE",
    items: [
      { label: "BTC / USD",        href: "/price",                    icon: Bitcoin,          exact: true, free: true },
      { label: "ETH / USD",        href: "/price?asset=eth",          icon: Layers,           exact: true },
      { label: "Market Regime",    href: "/price/market-regime",      icon: Radar },
      { label: "4-Year Cycle",     href: "/price/four-year-cycle",    icon: CalendarDays },
      { label: "2-Year MA",        href: "/price/two-year-ma",        icon: BarChart3 },
      { label: "100-Week MA",      href: "/price/btc-100w-ma",        icon: TrendingUp },
      { label: "Realized Price",   href: "/price/realized-price",     icon: CircleDollarSign },
      { label: "Moving Averages",  href: "/price?view=ma",            icon: LineChart,         exact: true },
      { label: "Ratio Charts",    href: "/price/ratios",             icon: BarChart2 },
      { label: "Weekly SMA",        href: "/price/weekly-sma",         icon: TrendingUp },
      { label: "Golden/Death Cross", href: "/price/golden-death-cross", icon: TrendingUp },
      { label: "Heikin-Ashi",      href: "/price/heikin-ashi",        icon: BarChart2 },
      { label: "Fear & Greed",      href: "/price/fear-greed",         icon: Activity, free: true },
      { label: "Drawdown / ATH",   href: "/price/drawdown",           icon: TrendingDown },
      { label: "Yearly Lows",      href: "/price/yearly-lows",        icon: TrendingDown },
      { label: "Liquidity Heatmap", href: "/price/liquidity",          icon: Flame },
      { label: "Pi Cycle Bottom",  href: "/price/pi-cycle-bottom",    icon: TrendingDown },
      { label: "Hash Ribbons",     href: "/price/hash-ribbons",       icon: Waves },
      { label: "BTC / M2",        href: "/price/btc-m2",             icon: DollarSign },
      { label: "Power Law",       href: "/price/power-law",          icon: TrendingUp },
    ],
  },
  {
    section: "ON-CHAIN",
    items: [
      { label: "Cycle Master",       href: "/onchain/cycle-master",       icon: Layers },
      { label: "MVRV Z-Score",       href: "/onchain",                   icon: Zap,        exact: true },
      { label: "SOPR",              href: "/onchain/sopr",              icon: Activity },
      { label: "HODL Wave",         href: "/onchain/hodl-wave",         icon: Lock },
      { label: "Capital Age Structure", href: "/onchain/capital-age",   icon: Waves },
      { label: "Value Floors",      href: "/onchain/cvdd",              icon: BarChart2 },
      { label: "Bottom Confluence", href: "/onchain/bottom-confluence", icon: Crosshair },
      { label: "NUPL",              href: "/onchain/reserve-risk",      icon: ShieldCheck },
      { label: "Puell Multiple",    href: "/onchain?metric=puell",      icon: Cpu,        exact: true },
      { label: "NVT Signal",        href: "/onchain?metric=nvt",        icon: Network,    exact: true },
      { label: "Active Addresses",  href: "/onchain?metric=addresses",  icon: Users,      exact: true },
    ],
  },
  {
    section: "MARKET STRUCTURE",
    items: [
      { label: "ETF Flows",          href: "/etf-flows",                  icon: ArrowLeftRight },
      { label: "Altcoin Season",     href: "/altseason",                  icon: Waves },
      { label: "BTC Dominance",      href: "/dominance",                  icon: PieChart,  exact: true },
      { label: "ETH Dominance",      href: "/dominance?asset=eth",        icon: PieChart,  exact: true },
      { label: "Total Market Cap",   href: "/dominance?view=total",       icon: BarChart2, exact: true },
      { label: "Stablecoin Dom.",    href: "/dominance/stablecoins",      icon: CircleDollarSign },
      { label: "Cross-Asset Map",    href: "/cross-asset",                icon: Scale },
    ],
  },
  {
    section: "MACRO",
    items: [
      { label: "SPX & Recession",  href: "/macro/spx-recession", icon: BarChart2 },
      { label: "DXY",              href: "/macro",               icon: DollarSign, exact: true },
      { label: "Fed Funds Rate",   href: "/macro?chart=fed",     icon: Landmark,   exact: true },
      { label: "CPI / Inflation",  href: "/macro?chart=cpi",     icon: TrendingUp, exact: true },
      { label: "M2 Liquidity",     href: "/macro?chart=m2",      icon: Waves,      exact: true },
      { label: "DXY Dollar Index", href: "/macro/dxy",            icon: TrendingDown },
      { label: "Precious Metals",  href: "/macro/metals",         icon: CircleDollarSign },
      { label: "Liquidity Regime", href: "/macro/liquidity-regime", icon: Radar },
      { label: "GLI Liquidity Lag", href: "/macro/gli",              icon: Timer },
      { label: "10Y Yield",        href: "/macro?chart=yield",   icon: LineChart,  exact: true },
    ],
  },
  {
    section: "EQUITIES",
    items: [
      { label: "Watchlist",  href: "/equities",        icon: Briefcase,    exact: true },
      { label: "NVDA",       href: "/equities/NVDA",   icon: TrendingDown },
      { label: "PLTR",       href: "/equities/PLTR",   icon: TrendingDown },
      { label: "ARM",        href: "/equities/ARM",    icon: TrendingDown },
      { label: "RKLB",       href: "/equities/RKLB",   icon: TrendingDown },
      { label: "COIN",       href: "/equities/COIN",   icon: TrendingDown },
      { label: "MSTR",       href: "/equities/MSTR",   icon: TrendingDown },
    ],
  },
  {
    section: "TOOLS",
    items: [
      { label: "External Links", href: "/links",       icon: ExternalLink },
      { label: "Methodology",    href: "/methodology", icon: BookOpen },
    ],
  },
];

function isSection(entry: NavItem | NavSection): entry is NavSection {
  return "section" in entry;
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const hrefBase = item.href.split("?")[0].split("#")[0];
  const active = item.exact
    ? pathname === hrefBase
    : pathname === hrefBase || pathname.startsWith(hrefBase + "/");

  return (
    <Link
      href={item.href}
      onClick={onClick}
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
      {item.free && (
        <span
          className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider"
          style={{ backgroundColor: "rgba(53,208,127,0.15)", color: "var(--sct-green)" }}
        >
          FREE
        </span>
      )}
    </Link>
  );
}

type SidebarProps = {
  isOpen:  boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Base: fixed, full height, slide via transform
        "fixed left-0 top-0 h-screen w-[260px] z-40 flex flex-col border-r overflow-hidden",
        "transition-transform duration-300 ease-in-out",
        // Mobile: hidden by default, slide in when open
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: always visible, ignore isOpen
        "lg:translate-x-0",
      )}
      style={{
        backgroundColor: "var(--sct-panel)",
        borderColor: "var(--sct-border)",
      }}
    >
      {/* Brand + mobile close */}
      <div
        className="h-16 flex items-center justify-between px-5 border-b shrink-0"
        style={{ borderColor: "var(--sct-border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/skyline-full.png"
          alt="Skyline Cycle Terminal"
          style={{
            width:        148,
            height:       'auto',
            filter:       'invert(1) brightness(1.8)',
            mixBlendMode: 'screen',
            opacity:      0.92,
          }}
        />
        {/* X close — only visible on mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md transition-colors"
          style={{ color: "var(--sct-muted)" }}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
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
                    <NavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onClick={onClose}
                    />
                  ))}
                </div>
              </div>
            );
          }
          return (
            <NavLink
              key={entry.href}
              item={entry}
              pathname={pathname}
              onClick={onClose}
            />
          );
        })}
      </nav>
    </aside>
  );
}
