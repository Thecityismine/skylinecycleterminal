export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-[var(--sct-card)]" />
        <div className="h-4 w-96 rounded-lg bg-[var(--sct-card)]" />
      </div>

      {/* Regime banner skeleton */}
      <div className="h-20 rounded-xl bg-[var(--sct-card)]" />

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--sct-card)]" />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-96 rounded-xl bg-[var(--sct-card)]" />

      {/* Issuer table skeleton */}
      <div className="h-64 rounded-xl bg-[var(--sct-card)]" />
    </div>
  );
}
