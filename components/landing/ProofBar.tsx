// Hard numbers directly under the hero. Everything here is verifiable from the
// codebase — the point is that Skyline's proof is checkable, which is the whole
// contrast against competitors quoting round user counts they can't support.
//
// ── PLACEHOLDER ──────────────────────────────────────────────────────────────
// AUDIENCE below is the one unverifiable stat. It is gated behind
// AUDIENCE_STAT_READY so placeholder copy cannot reach production by accident.
// To ship it: replace `value`/`label` with the real figure, then flip the flag.
// ─────────────────────────────────────────────────────────────────────────────
const AUDIENCE_STAT_READY = false;

const AUDIENCE = {
  value: "[TODO]",
  label: "PLACEHOLDER — subscribers / followers",
};

const STATS = [
  { value: "11", label: "Indicators behind every Cycle Score" },
  { value: "2012", label: "Price history the models run on" },
  { value: "50+", label: "Models and dashboards" },
  { value: "4", label: "Halving cycles covered" },
];

export function ProofBar() {
  const stats = AUDIENCE_STAT_READY ? [...STATS.slice(0, 3), AUDIENCE] : STATS;

  return (
    <section className="max-w-4xl mx-auto px-6 pb-16">
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--sct-border)", backgroundColor: "var(--sct-border)" }}
      >
        {stats.map((s) => (
          <div key={s.label} className="p-5 text-center" style={{ backgroundColor: "var(--sct-card)" }}>
            <p className="text-2xl sm:text-3xl font-mono font-bold mb-1.5" style={{ color: "var(--sct-btc)" }}>
              {s.value}
            </p>
            <p className="text-[11px] leading-snug" style={{ color: "var(--sct-muted)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-center mt-4" style={{ color: "var(--sct-muted)" }}>
        Every figure above is checkable inside the terminal. No rounded-up user counts.
      </p>
    </section>
  );
}
