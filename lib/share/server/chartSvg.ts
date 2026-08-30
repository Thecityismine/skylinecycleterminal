import 'server-only';

// Server-rendered chart cards, as plain SVG.
//
// WHY NOT THE EXISTING SHARE CARDS
// components/share/*ShareCard.tsx render Recharts into the DOM and rasterise
// with html-to-image. Both halves need a browser, and a scheduled job does not
// have one. next/og was the obvious alternative and does not work either: it
// runs Satori, which has no DOM and cannot execute Recharts.
//
// So the chart is drawn here from coordinates — no chart library, no DOM — and
// sharp rasterises the result. sharp is already in the tree for Next's image
// optimisation, and is now pinned directly since this depends on it.
//
// The trade is real: this cannot reproduce every existing card, and it is not
// meant to. It draws one shape well — a price line, an optional second series,
// a stats strip — which is what a social card needs.
//
// Everything is escaped. Chart names and notes come out of Notion, which is
// user-editable, and an unescaped ampersand produces an SVG that sharp rejects
// with a parse error rather than anything obviously security-shaped.

export const CARD_W = 1200;
export const CARD_H = 675;

const PAD = 48;
const HEADER_H = 96;
const STATS_H = 92;
const FOOTER_H = 40;
const PLOT_X = PAD;
const PLOT_Y = PAD + HEADER_H + STATS_H;
const PLOT_W = CARD_W - PAD * 2;
const PLOT_H = CARD_H - PLOT_Y - FOOTER_H - PAD;

export const COLORS = {
  bg:      '#0D1117',
  panel:   '#161B22',
  border:  '#21262D',
  text:    '#F7F9FC',
  muted:   '#8B949E',
  faint:   '#484F58',
  btc:     '#F7931A',
  green:   '#35D07F',
  amber:   '#E6B450',
  red:     '#FF5C5C',
  violet:  '#A78BFA',
} as const;

export type Series = { label: string; color: string; points: number[] };

export type Stat = { label: string; value: string; sub?: string; color?: string };

export type ChartCard = {
  title:     string;
  subtitle:  string;
  /** Left-to-right x labels under the plot. Four or five reads best. */
  xLabels:   string[];
  series:    Series[];
  stats:     Stat[];
  /** Drawn top-right, e.g. "Aug 30, 2026". */
  date:      string;
  /** Log scale suits price over long windows; linear suits ratios. */
  logScale?: boolean;
};

/** XML-escapes text bound for SVG. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Maps a series to an SVG path.
 *
 * Scaling is shared across every series so they stay comparable, and nulls or
 * non-finite values break the path rather than being interpolated over — a
 * straight line across a data gap is a lie the reader cannot see.
 */
function pathFor(values: number[], min: number, max: number, log: boolean): string {
  if (values.length < 2) return '';
  const span = max - min || 1;
  const norm = (v: number) => {
    if (!log) return (v - min) / span;
    const lo = Math.log10(Math.max(min, 1e-9));
    const hi = Math.log10(Math.max(max, 1e-9));
    return (Math.log10(Math.max(v, 1e-9)) - lo) / (hi - lo || 1);
  };

  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (!Number.isFinite(v) || v <= (log ? 0 : -Infinity)) { pen = false; return; }
    const x = PLOT_X + (i / (values.length - 1)) * PLOT_W;
    const y = PLOT_Y + PLOT_H - norm(v) * PLOT_H;
    d += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    pen = true;
  });
  return d.trim();
}

export function buildChartCardSvg(c: ChartCard): string {
  const all = c.series.flatMap((s) => s.points).filter((v) => Number.isFinite(v) && v > 0);
  const min = all.length ? Math.min(...all) : 0;
  const max = all.length ? Math.max(...all) : 1;
  // Headroom so the line never touches the frame.
  const lo = c.logScale ? min * 0.85 : min - (max - min) * 0.08;
  const hi = c.logScale ? max * 1.15 : max + (max - min) * 0.08;

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => PLOT_Y + PLOT_H * f);

  const statW = c.stats.length ? (PLOT_W - (c.stats.length - 1) * 14) / c.stats.length : PLOT_W;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="DejaVu Sans, Verdana, Geneva, sans-serif">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${COLORS.bg}"/>

  <text x="${PAD}" y="${PAD + 30}" fill="${COLORS.text}" font-size="34" font-weight="700">${esc(c.title)}</text>
  <text x="${PAD}" y="${PAD + 62}" fill="${COLORS.muted}" font-size="18">${esc(c.subtitle)}</text>

  <circle cx="${CARD_W - PAD - 128}" cy="${PAD + 14}" r="5" fill="${COLORS.green}"/>
  <text x="${CARD_W - PAD - 114}" y="${PAD + 20}" fill="${COLORS.green}" font-size="15" letter-spacing="1.6">LIVE DATA</text>
  <text x="${CARD_W - PAD}" y="${PAD + 48}" fill="${COLORS.muted}" font-size="16" text-anchor="end">${esc(c.date)}</text>

  ${c.stats.map((s, i) => {
    const x = PAD + i * (statW + 14);
    return `<g>
    <rect x="${x}" y="${PAD + HEADER_H}" width="${statW}" height="${STATS_H - 20}" rx="10" fill="${COLORS.panel}" stroke="${COLORS.border}"/>
    <text x="${x + 16}" y="${PAD + HEADER_H + 22}" fill="${COLORS.muted}" font-size="14">${esc(s.label)}</text>
    <text x="${x + 16}" y="${PAD + HEADER_H + 50}" fill="${s.color ?? COLORS.text}" font-size="26" font-weight="700">${esc(s.value)}</text>
    ${s.sub ? `<text x="${x + 16}" y="${PAD + HEADER_H + 68}" fill="${COLORS.faint}" font-size="13">${esc(s.sub)}</text>` : ''}
  </g>`;
  }).join('\n  ')}

  ${gridY.map((y) => `<line x1="${PLOT_X}" y1="${y.toFixed(1)}" x2="${PLOT_X + PLOT_W}" y2="${y.toFixed(1)}" stroke="${COLORS.border}" stroke-width="1" stroke-dasharray="3 5"/>`).join('\n  ')}

  ${c.series.map((s) => {
    const d = pathFor(s.points, lo, hi, !!c.logScale);
    return d ? `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : '';
  }).join('\n  ')}

  ${c.xLabels.map((l, i) => {
    const x = PLOT_X + (i / Math.max(1, c.xLabels.length - 1)) * PLOT_W;
    const anchor = i === 0 ? 'start' : i === c.xLabels.length - 1 ? 'end' : 'middle';
    return `<text x="${x.toFixed(1)}" y="${PLOT_Y + PLOT_H + 26}" fill="${COLORS.faint}" font-size="15" text-anchor="${anchor}">${esc(l)}</text>`;
  }).join('\n  ')}

  ${c.series.map((s, i) => {
    const x = PAD + i * 190;
    const y = CARD_H - PAD + 4;
    return `<g>
    <rect x="${x}" y="${y - 10}" width="22" height="4" rx="2" fill="${s.color}"/>
    <text x="${x + 30}" y="${y - 1}" fill="${COLORS.muted}" font-size="15">${esc(s.label)}</text>
  </g>`;
  }).join('\n  ')}

  <text x="${CARD_W - PAD}" y="${CARD_H - PAD + 3}" fill="${COLORS.faint}" font-size="14" text-anchor="end">skylinecycleterminal.com · Not financial advice</text>
</svg>`;
}
