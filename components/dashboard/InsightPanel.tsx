import { cn } from "@/lib/utils";

interface InsightPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function InsightPanel({ title = "Current Market Read", children, className }: InsightPanelProps) {
  return (
    <div
      className={cn("rounded-xl border p-5", className)}
      style={{
        backgroundColor: "var(--sct-card)",
        borderColor: "var(--sct-border)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      <p
        className="text-xs font-medium tracking-wider uppercase mb-3"
        style={{ color: "var(--sct-muted)" }}
      >
        {title}
      </p>
      <div
        className="text-sm leading-relaxed"
        style={{ color: "var(--sct-secondary)" }}
      >
        {children}
      </div>
    </div>
  );
}

interface InsightRowProps {
  label: string;
  value: string;
  valueColor?: string;
  stack?: boolean;
}

export function InsightRow({ label, value, valueColor, stack }: InsightRowProps) {
  return (
    <div
      className={cn(
        "py-1.5 border-b last:border-0",
        stack
          ? "flex flex-col gap-0.5"
          : "flex justify-between items-baseline"
      )}
      style={{ borderColor: "var(--sct-border)" }}
    >
      <span className="text-xs" style={{ color: "var(--sct-muted)" }}>{label}</span>
      <span
        className="text-xs font-mono font-medium"
        style={{ color: valueColor ?? "var(--sct-text)" }}
      >
        {value}
      </span>
    </div>
  );
}
