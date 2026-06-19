export function Header() {
  // Placeholder values — wired to live data in the next phase
  const stats = [
    { label: "BTC", value: "$—", change: null, color: "var(--sct-btc)" },
    { label: "ETH", value: "$—", change: null, color: "var(--sct-eth)" },
    { label: "BTC.D", value: "—%", change: null, color: "var(--sct-secondary)" },
  ];

  return (
    <header
      className="h-16 shrink-0 sticky top-0 z-30 flex items-center justify-between px-8 border-b backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(9,13,19,0.85)",
        borderColor: "var(--sct-border)",
      }}
    >
      {/* Left: price tickers */}
      <div className="flex items-center gap-6">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className="text-xs font-medium tracking-wider"
              style={{ color: "var(--sct-muted)" }}
            >
              {s.label}
            </span>
            <span
              className="text-sm font-mono font-medium"
              style={{ color: s.color }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Right: regime badge + status */}
      <div className="flex items-center gap-4">
        {/* Fear & Greed placeholder */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs tracking-wider"
            style={{ color: "var(--sct-muted)" }}
          >
            FEAR & GREED
          </span>
          <span
            className="text-sm font-mono"
            style={{ color: "var(--sct-secondary)" }}
          >
            —
          </span>
        </div>

        {/* Regime badge */}
        <span
          className="px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wider uppercase border"
          style={{
            backgroundColor: "rgba(59,130,246,0.12)",
            borderColor: "rgba(59,130,246,0.3)",
            color: "var(--sct-blue)",
          }}
        >
          Initializing
        </span>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--sct-amber)" }}
          />
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--sct-muted)" }}
          >
            Skeleton
          </span>
        </div>
      </div>
    </header>
  );
}
