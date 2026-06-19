import { cn } from "@/lib/utils";

type Regime = "accumulate" | "hold" | "caution" | "distribution" | "neutral";

const regimeConfig: Record<Regime, { label: string; bg: string; border: string; color: string }> = {
  accumulate:   { label: "ACCUMULATION",   bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)",  color: "var(--sct-blue)" },
  hold:         { label: "MID CYCLE",      bg: "rgba(53,208,127,0.12)",  border: "rgba(53,208,127,0.3)",  color: "var(--sct-green)" },
  caution:      { label: "CAUTION",        bg: "rgba(230,180,80,0.12)",  border: "rgba(230,180,80,0.3)",  color: "var(--sct-amber)" },
  distribution: { label: "DISTRIBUTION",  bg: "rgba(255,92,92,0.12)",   border: "rgba(255,92,92,0.3)",   color: "var(--sct-red)" },
  neutral:      { label: "NEUTRAL",        bg: "rgba(169,180,192,0.12)", border: "rgba(169,180,192,0.3)", color: "var(--sct-secondary)" },
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  regime?: Regime;
  className?: string;
}

export function PageHeader({ title, subtitle, regime, className }: PageHeaderProps) {
  const badge = regime ? regimeConfig[regime] : null;

  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center gap-3 mb-1">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--sct-text)" }}
        >
          {title}
        </h1>
        {badge && (
          <span
            className="px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wider border"
            style={{ backgroundColor: badge.bg, borderColor: badge.border, color: badge.color }}
          >
            {badge.label}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-sm" style={{ color: "var(--sct-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
