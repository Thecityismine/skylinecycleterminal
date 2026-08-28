import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accent?: string;
  source?: string;
  freshness?: "live" | "daily" | "weekly" | "cached";
  className?: string;
}

const freshnessConfig = {
  live:    { dot: "var(--sct-green)",     label: "LIVE" },
  daily:   { dot: "var(--sct-blue)",      label: "DAILY" },
  weekly:  { dot: "var(--sct-amber)",     label: "WEEKLY" },
  cached:  { dot: "var(--sct-secondary)", label: "CACHED" },
};

export function StatCard({
  label,
  value,
  sub,
  trend,
  accent,
  source,
  freshness,
  className,
}: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "var(--sct-green)"
      : trend === "down"
      ? "var(--sct-red)"
      : "var(--sct-muted)";

  const trendArrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "→";
  const fw = freshness ? freshnessConfig[freshness] : null;

  return (
    // min-w-0 is the actual fix for these cards overflowing their grid.
    //
    // A grid item defaults to `min-width: auto`, meaning it refuses to shrink below
    // its content's intrinsic width -- so a long value pushes the whole track wider
    // and out of the viewport, no matter what font size the text is. Reducing the
    // type to text-2xl helped the common case and left the longer values still
    // overflowing (24-37px on /cycle-timer, /onchain/reserve-risk,
    // /macro/liquidity-regime and /cross-asset, all of which use the same
    // grid-cols-2 as pages that were fine -- the difference was value length, not
    // card width). This lets the track shrink so the value can wrap instead.
    <div
      className={cn("rounded-xl p-5 border flex flex-col gap-2 min-w-0", className)}
      style={{
        backgroundColor: "var(--sct-card)",
        borderColor: "var(--sct-border)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      {/* Top row: label + freshness.
        *
        * Wraps for the same reason the value below needs min-w-0: in a three-column
        * grid these cards get about 96px, and a longer label beside a freshness
        * badge ("Historical Percentile" + DAILY) overran it by 30px on
        * /tools/risk-level. The badge keeps shrink-0 so it stays intact and the
        * label is what gives way. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span
          className="text-xs font-medium tracking-wider uppercase min-w-0 break-words"
          style={{ color: "var(--sct-muted)" }}
        >
          {label}
        </span>
        {fw && (
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: fw.dot }}
            />
            <span
              className="text-[10px] font-mono tracking-wider"
              style={{ color: "var(--sct-muted)" }}
            >
              {fw.label}
            </span>
          </div>
        )}
      </div>

      {/* Main value.
        *
        * Responsive size is load-bearing on mobile. These cards sit in a 2-column
        * grid, which leaves each one about 121px of inner width on a 375px screen.
        * At a fixed text-3xl a six-figure price ("$103,412") measured ~150px and
        * spilled past the card edge on every page carrying one. text-2xl fits, and
        * the full size returns at the `sm` breakpoint where the grid widens. */}
      <span
        className="text-2xl sm:text-3xl font-mono font-bold tracking-tight min-w-0 break-words"
        style={{ color: accent ?? "var(--sct-text)" }}
      >
        {value}
      </span>

      {/* Sub / trend */}
      {sub && (
        <div className="flex items-center gap-1.5">
          {trend && (
            <span className="text-xs font-mono" style={{ color: trendColor }}>
              {trendArrow}
            </span>
          )}
          <span className="text-xs font-mono" style={{ color: trendColor }}>
            {sub}
          </span>
        </div>
      )}

    </div>
  );
}
