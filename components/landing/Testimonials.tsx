// ── PLACEHOLDER SECTION ──────────────────────────────────────────────────────
// The structure is built and styled, but every quote below is invented filler.
// It is gated behind TESTIMONIALS_READY so it renders in development only and
// cannot reach production while the copy is still fake.
//
// To ship:
//   1. Replace every entry in TESTIMONIALS with a real quote, real name, and a
//      real source label (e.g. "Premium subscriber", "via X").
//   2. Set TESTIMONIALS_READY to true.
//
// Do not ship invented quotes. Attributed testimonials that aren't real are
// both a legal problem and the exact credibility failure this section exists
// to beat competitors on.
// ─────────────────────────────────────────────────────────────────────────────
const TESTIMONIALS_READY = false;

const TESTIMONIALS = [
  {
    quote: "PLACEHOLDER. Replace with a real subscriber quote about a decision Skyline helped them think through.",
    name: "[TODO: real name]",
    source: "[TODO: source label]",
  },
  {
    quote: "PLACEHOLDER. Replace with a real quote. Outcome-specific beats 'great UI'.",
    name: "[TODO: real name]",
    source: "[TODO: source label]",
  },
  {
    quote: "PLACEHOLDER. Replace with a real quote, ideally one that names the cycle read or a specific model.",
    name: "[TODO: real name]",
    source: "[TODO: source label]",
  },
];

export function Testimonials() {
  if (!TESTIMONIALS_READY && process.env.NODE_ENV === "production") return null;

  return (
    <section className="max-w-5xl mx-auto px-6 py-16">
      {!TESTIMONIALS_READY && (
        <p
          className="text-xs text-center mb-6 px-4 py-2 rounded-md border max-w-xl mx-auto"
          style={{ color: "var(--sct-amber)", borderColor: "var(--sct-amber)" }}
        >
          Dev-only preview. Placeholder copy, hidden in production until real quotes replace it.
        </p>
      )}
      <h2 className="text-2xl font-semibold text-center mb-10" style={{ color: "var(--sct-text)" }}>
        What subscribers say
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Keyed by position, not name: the placeholders share a name, and real
            testimonials are a fixed, non-reordering list where index is stable. */}
        {TESTIMONIALS.map((t, i) => (
          <figure
            key={i}
            className="rounded-xl border p-6 flex flex-col"
            style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
          >
            <blockquote className="text-sm leading-relaxed mb-4 grow" style={{ color: "var(--sct-secondary)" }}>
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption>
              <p className="text-sm font-medium" style={{ color: "var(--sct-text)" }}>{t.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--sct-muted)" }}>{t.source}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
