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
    <div
      className={cn("rounded-xl p-5 border flex flex-col gap-2", className)}
      style={{
        backgroundColor: "var(--sct-card)",
        borderColor: "var(--sct-border)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      {/* Top row: label + freshness */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium tracking-wider uppercase"
          style={{ color: "var(--sct-muted)" }}
        >
          {label}
        </span>
        {fw && (
          <div className="flex items-center gap-1">
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

      {/* Main value */}
      <span
        className="text-3xl font-mono font-bold tracking-tight"
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
