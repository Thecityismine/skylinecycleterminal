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
      {/* flex-wrap and min-w-0 are load-bearing on mobile.
        *
        * Without them a long title cannot shrink and the badge cannot drop to a
        * second line, so this row measures wider than a 375px viewport. Because it
        * sits at the top of the page, the overflow widens the whole document: the
        * title clips off the left edge and chart controls run off the right. It
        * looks like a chart bug and is not one.
        *
        * `break-words` covers the remaining case of a single unbroken token longer
        * than the viewport, which min-w-0 alone would still overflow. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-1">
        <h1
          className="text-xl sm:text-2xl font-semibold tracking-tight min-w-0 break-words"
          style={{ color: "var(--sct-text)" }}
        >
          {title}
        </h1>
        {badge && (
          <span
            className="px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wider border shrink-0"
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
