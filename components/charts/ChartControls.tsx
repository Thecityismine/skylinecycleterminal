"use client";

// Shared chart control primitives.
//
// WHY THIS EXISTS
// Chart sections had grown at least six different className combinations for what
// is the same row: a title block on the left, a legend and some buttons on the
// right. They also disagreed on button padding, border treatment and active-state
// colour, so the same control looked slightly different from page to page.
//
// The mobile bug they shared is subtle and worth recording, because it is not the
// obvious one. The outer row usually DID have `flex-wrap`. What broke was the
// child: a legend group carrying `shrink-0` and no wrap of its own. `flex-shrink: 0`
// sizes that child to max-content, so it never narrows, the outer row has nothing
// to wrap, and the group runs past the card edge — measured at 191px past a 375px
// viewport on /price/hash-ribbons and 148px on /price/pi-cycle-bottom.
//
// Because the protected layout wraps everything in `h-dvh overflow-hidden`, that
// overflow does not produce a scrollbar. It is silently clipped, which is why the
// symptom reads as "the title is cut off" rather than "this row is too wide".
//
// Every element here wraps and nothing pins itself open with `shrink-0`.

import type { ReactNode } from 'react';

// ── Row ───────────────────────────────────────────────────────────────────────

/**
 * The standard chart header: description on the left, controls on the right,
 * stacking to two rows when there is not enough width for both.
 */
export function ChartControlBar({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Wrapping container for legend entries or buttons.
 *
 * `min-w-0` rather than `shrink-0` is the whole point — see the note above.
 */
export function ChartControlGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 ${className}`}>
      {children}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

/** One legend entry: a colour swatch and its label. */
export function ChartLegendItem({
  color,
  label,
  muted = false,
  thick = false,
}: {
  color: string;
  label: string;
  /** Render the label in muted grey rather than the swatch colour. */
  muted?: boolean;
  thick?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-mono">
      <span
        className="inline-block rounded-[1px] shrink-0"
        style={{ width: 16, height: thick ? 3 : 2, backgroundColor: color }}
      />
      <span style={{ color: muted ? 'var(--sct-muted)' : color }}>{label}</span>
    </span>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────────

// min-h-[32px] gives a usable tap target on a phone. The old buttons were `py-1`
// on 12px text, which came out around 26px tall — reachable with a mouse, fiddly
// with a thumb. Kept below the 44px iOS ideal deliberately: these sit in dense
// control rows where full-size targets would push the chart off the first screen.
const BUTTON_BASE =
  'px-3 min-h-[32px] inline-flex items-center justify-center rounded text-xs font-mono ' +
  'border transition-all duration-150 whitespace-nowrap';

/**
 * Toggle button for a named series or overlay. `color` drives the active state so
 * the control matches the line it governs.
 */
export function ChartToggleButton({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={BUTTON_BASE}
      style={{
        backgroundColor: active ? `${color}20` : 'transparent',
        borderColor:     active ? color : 'var(--sct-border)',
        color:           active ? color : 'var(--sct-muted)',
      }}
    >
      {label}
    </button>
  );
}

/**
 * Neutral selector button, for timeframes and other one-of-many choices where a
 * per-option colour would be noise.
 */
export function ChartPeriodButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={BUTTON_BASE}
      style={{
        backgroundColor: active ? 'var(--sct-border)' : 'transparent',
        borderColor:     'var(--sct-border)',
        color:           active ? 'var(--sct-text)' : 'var(--sct-muted)',
      }}
    >
      {label}
    </button>
  );
}

/** Thin vertical rule between button clusters. Hidden once a row has wrapped. */
export function ChartControlDivider() {
  return (
    <span
      aria-hidden
      className="hidden sm:block w-px self-stretch my-1"
      style={{ backgroundColor: 'var(--sct-border)' }}
    />
  );
}
