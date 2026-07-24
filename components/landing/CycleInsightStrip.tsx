"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApiData } from "@/lib/hooks/useApiData";
import type { CycleScoreResult } from "@/lib/indicators/skylineScore";

// Live, data-backed hero teaser — pulls the real-time Skyline Cycle Score
// instead of static marketing copy, so the "data first, opinion second"
// positioning is literally true on the page.
export function CycleInsightStrip() {
  const { data: cycle, loading } = useApiData<CycleScoreResult>("/api/cycle");

  if (loading || !cycle) {
    return (
      <div className="flex items-center justify-center mb-6">
        <div
          className="h-8 w-80 max-w-full rounded-full animate-pulse"
          style={{ backgroundColor: "var(--sct-border)" }}
        />
      </div>
    );
  }

  const reserveRisk = cycle.indicators.find(
    (i) => i.name === "Reserve Risk" && i.available
  );

  return (
    <Link
      href="/cycle"
      className="group inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-6 px-4 py-2 rounded-full border text-xs sm:text-sm text-center transition-colors"
      style={{ borderColor: "var(--sct-border)", color: "var(--sct-secondary)" }}
    >
      <span className="font-mono font-semibold" style={{ color: cycle.zoneColor }}>
        {cycle.score}
      </span>
      <span>
        Skyline Cycle Score right now:{" "}
        <strong style={{ color: cycle.zoneColor }}>{cycle.zoneLabel}</strong>
        {reserveRisk ? ` — ${reserveRisk.rawLabel}.` : "."}
      </span>
      <span
        className="inline-flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--sct-btc)" }}
      >
        View live
        <ArrowRight size={12} />
      </span>
    </Link>
  );
}
