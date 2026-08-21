"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useApiData } from "@/lib/hooks/useApiData";
import type { ResearchSummary } from "@/lib/research/summary";

// Every figure here is a projection of the actual report, served by
// /api/research/summary. This card previously rebuilt the ledger client-side
// from the cycle score alone, which weighted 11 indicators where the report
// weights 19 — so the two surfaces could name different regimes on the same
// day. Nothing in this file computes a reading any more.

function extensionColor(e: number): string {
  if (e < 25) return "#3B82F6";
  if (e < 45) return "#35D07F";
  if (e < 60) return "#6B7280";
  if (e < 78) return "#E6B450";
  return "#FF5C5C";
}

function Skeleton() {
  return (
    <div
      className="rounded-2xl border p-6 sm:p-8"
      style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-2.5 w-20 rounded animate-pulse mb-2" style={{ backgroundColor: "var(--sct-border)" }} />
            <div className="h-7 w-24 rounded animate-pulse" style={{ backgroundColor: "var(--sct-border)" }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((c) => (
          <div key={c} className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-3 w-full rounded animate-pulse" style={{ backgroundColor: "var(--sct-border)" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeepResearchPreview() {
  const { data: summary, loading } = useApiData<ResearchSummary>("/api/research/summary");

  if (loading || !summary) return <Skeleton />;

  const { supporting, weakening } = summary;
  const accent = extensionColor(summary.weightedExtension);

  // A count of zero is a neutral fact, not a warning — colouring it red reads as
  // an alarm when it means the opposite.
  const countColor = (n: number, active: string) => (n === 0 ? "var(--sct-muted)" : active);

  const tiles = [
    { label: "Skyline Cycle Score", value: `${Math.round(summary.cycleScore)}`, sub: summary.zoneLabel, color: summary.zoneColor },
    { label: "Current Regime", value: summary.thesisLabel, sub: `${summary.indicatorsRead} indicators read`, color: accent },
    { label: "Supporting", value: `${summary.supportingCount}`, sub: "aligned with the reading", color: countColor(summary.supportingCount, "#35D07F") },
    { label: "Weakening", value: `${summary.weakeningCount}`, sub: "pointing the other way", color: countColor(summary.weakeningCount, "#FF5C5C") },
  ];

  return (
    <Link
      href="/research"
      className="group block rounded-2xl border p-6 sm:p-8 transition-all duration-200 hover:-translate-y-0.5"
      style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
    >
      {/* Masthead — mirrors the report's own header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: "var(--sct-muted)" }}>
            Live from the terminal
          </p>
          <p className="text-lg sm:text-xl font-semibold mt-1" style={{ color: "var(--sct-text)" }}>
            Today&apos;s reading
          </p>
        </div>
        <span
          className="hidden sm:inline-flex items-center gap-1 text-xs font-medium shrink-0 mt-1 opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--sct-btc)" }}
        >
          Open the report
          <ArrowRight size={13} />
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 mb-8">
        {tiles.map((t) => (
          <div key={t.label}>
            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--sct-muted)" }}>
              {t.label}
            </p>
            {/* Regime values are words, not numbers ("Neutral / Transitional"), so the
                type scales down on narrow columns and is allowed to wrap. */}
            <p
              className="text-xl sm:text-2xl md:text-3xl font-mono font-bold leading-tight break-words"
              style={{ color: t.color }}
            >
              {t.value}
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: "var(--sct-muted)" }}>{t.sub}</p>
          </div>
        ))}
      </div>

      {/* The evidence split — the differentiator, shown rather than described */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pt-6"
        style={{ borderTop: "1px solid var(--sct-border)" }}
      >
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold mb-3" style={{ color: "#35D07F" }}>
            <TrendingUp size={13} />
            Evidence supporting the reading
          </p>
          <ul className="space-y-2">
            {supporting.map((i) => (
              <li key={i.id} className="flex items-baseline justify-between gap-3 text-xs">
                <span style={{ color: "var(--sct-secondary)" }}>{i.label}</span>
                <span className="font-mono shrink-0" style={{ color: "var(--sct-muted)" }}>{i.reading}</span>
              </li>
            ))}
            {!supporting.length && (
              <li className="text-xs" style={{ color: "var(--sct-muted)" }}>None right now.</li>
            )}
          </ul>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold mb-3" style={{ color: "#FF5C5C" }}>
            <TrendingDown size={13} />
            Evidence weakening it
          </p>
          <ul className="space-y-2">
            {weakening.map((i) => (
              <li key={i.id} className="flex items-baseline justify-between gap-3 text-xs">
                <span style={{ color: "var(--sct-secondary)" }}>{i.label}</span>
                <span className="font-mono shrink-0" style={{ color: "var(--sct-muted)" }}>{i.reading}</span>
              </li>
            ))}
            {!weakening.length && (
              <li className="text-xs leading-relaxed" style={{ color: "var(--sct-muted)" }}>
                Nothing in the tracked set currently argues against the reading. When something does, it appears
                here. The report never quietly drops its counter-evidence.
              </li>
            )}
          </ul>
        </div>
      </div>

      {summary.gapCount > 0 && (
        <p className="text-[11px] mt-6 pt-4" style={{ color: "var(--sct-muted)", borderTop: "1px solid var(--sct-border)" }}>
          {summary.gapCount} tracked indicator{summary.gapCount === 1 ? "" : "s"} unavailable right now and excluded from every
          figure above. The report lists {summary.gapCount === 1 ? "it" : "them"} rather than hiding {summary.gapCount === 1 ? "it" : "them"}.
        </p>
      )}
    </Link>
  );
}
