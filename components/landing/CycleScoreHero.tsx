"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApiData } from "@/lib/hooks/useApiData";
import { ZONE_CONFIG, type CycleScoreResult, type ScoreZone } from "@/lib/indicators/skylineScore";

// The Cycle Score is the product, so the hero renders the live number at full
// size rather than describing it in a feature card. Visitors get the actual
// answer before they get the pitch — which is also the strongest possible
// demonstration that the free tier is real.

// Mirrors the cut points in zoneFromScore() in lib/indicators/skylineScore.ts.
// If those thresholds move, move these too.
const BANDS: Array<{ zone: ScoreZone; from: number; to: number }> = [
  { zone: "accumulate", from: 0, to: 25 },
  { zone: "build", from: 25, to: 50 },
  { zone: "caution", from: 50, to: 75 },
  { zone: "distribution", from: 75, to: 100 },
];

// Describes what the number means, never what to do about it. The accumulate
// and distribution claims are backed by the point-in-time backtest published on
// /track-record (bottoms read 5, 10 and 4; the 2017 top read 95) — don't add a
// historical claim here that isn't evidenced on that page.
const ZONE_READ: Record<ScoreZone, string> = {
  accumulate: "The coldest quartile of the range. All three previous cycle bottoms read in this zone.",
  build: "Lower-middle of the range. The indicator set is reading below its historical median.",
  caution: "Upper-middle of the range. The indicator set is reading above its historical median.",
  distribution: "The hottest quartile of the range. The 2017 cycle top read 95 here.",
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-6 sm:p-8 mb-8 text-left"
      style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
    >
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <Frame>
      <div className="h-2.5 w-40 rounded animate-pulse mb-4" style={{ backgroundColor: "var(--sct-border)" }} />
      <div className="h-16 w-32 rounded animate-pulse mb-4" style={{ backgroundColor: "var(--sct-border)" }} />
      <div className="h-2 w-full rounded-full animate-pulse mb-4" style={{ backgroundColor: "var(--sct-border)" }} />
      <div className="h-3 w-3/4 rounded animate-pulse" style={{ backgroundColor: "var(--sct-border)" }} />
    </Frame>
  );
}

export function CycleScoreHero() {
  const { data: cycle, loading, error } = useApiData<CycleScoreResult>("/api/cycle");

  if (loading) return <Skeleton />;

  // A dead hero is worse than a quiet one — if the feed is down, degrade to a
  // working link instead of pulsing a skeleton forever.
  if (error || !cycle) {
    return (
      <Frame>
        <p className="text-sm mb-3" style={{ color: "var(--sct-secondary)" }}>
          The live Cycle Score is temporarily unavailable.
        </p>
        <Link href="/cycle" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--sct-btc)" }}>
          Open the Cycle Score
          <ArrowRight size={14} />
        </Link>
      </Frame>
    );
  }

  const reporting = cycle.indicators.filter((i) => i.available).length;
  const score = Math.round(cycle.score);

  return (
    <Link href="/cycle" className="group block">
      <Frame>
        <div className="flex items-start justify-between gap-4 mb-1">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: "var(--sct-muted)" }}>
            Skyline Cycle Score · live
          </p>
          <span
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--sct-btc)" }}
          >
            See the full read
            <ArrowRight size={13} />
          </span>
        </div>

        <div className="flex items-baseline gap-3 mb-1">
          <span
            className="font-mono font-bold leading-none text-6xl sm:text-7xl"
            style={{ color: cycle.zoneColor }}
          >
            {score}
          </span>
          <span className="font-mono text-lg" style={{ color: "var(--sct-muted)" }}>
            / 100
          </span>
          <span
            className="text-base sm:text-lg font-semibold ml-auto text-right"
            style={{ color: cycle.zoneColor }}
          >
            {cycle.zoneLabel}
          </span>
        </div>

        {/* Band track — shows the score in the context of the whole 0–100 range,
            so a single number reads as a position rather than a rating. */}
        <div className="relative mt-5 mb-3">
          <div className="flex h-2 rounded-full overflow-hidden">
            {BANDS.map((b) => (
              <div
                key={b.zone}
                style={{
                  width: `${b.to - b.from}%`,
                  backgroundColor: ZONE_CONFIG[b.zone].color,
                  opacity: b.zone === cycle.zone ? 0.95 : 0.22,
                }}
              />
            ))}
          </div>
          <div
            className="absolute top-1/2 w-1 h-5 rounded-full -translate-y-1/2 -translate-x-1/2"
            style={{
              left: `${Math.min(Math.max(score, 0), 100)}%`,
              backgroundColor: "var(--sct-text)",
              boxShadow: "0 0 0 2px var(--sct-card)",
            }}
          />
        </div>

        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 mb-4">
          {BANDS.map((b) => (
            <span
              key={b.zone}
              className="text-[10px] uppercase tracking-wider"
              style={{
                color: b.zone === cycle.zone ? ZONE_CONFIG[b.zone].color : "var(--sct-muted)",
                fontWeight: b.zone === cycle.zone ? 600 : 400,
              }}
            >
              {ZONE_CONFIG[b.zone].label}
            </span>
          ))}
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "var(--sct-secondary)" }}>
          {ZONE_READ[cycle.zone]}
        </p>
        <p className="text-[11px] mt-3" style={{ color: "var(--sct-muted)" }}>
          {reporting} of {cycle.indicators.length} indicators reporting · free, no signup
        </p>
      </Frame>
    </Link>
  );
}
