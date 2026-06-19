import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded animate-pulse", className)}
      style={{ backgroundColor: "var(--sct-border)" }}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="rounded-xl p-5 border flex flex-col gap-3"
      style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div
      className={cn("rounded-xl border flex items-center justify-center", height)}
      style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
    >
      <p className="text-sm" style={{ color: "var(--sct-muted)" }}>
        Chart loading…
      </p>
    </div>
  );
}
