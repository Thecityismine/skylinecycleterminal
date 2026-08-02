import { riskBand } from '@/lib/indicators/macroRisk';

/**
 * Macro Risk gauge. Shared by the live page and the share card so the two can
 * never drift apart: the card passes fixed hex colours (it is captured
 * off-screen where CSS variables are not guaranteed) and the page passes tokens.
 *
 * Geometry: a 240 degree arc with the gap centred on the bottom, so the scale
 * runs from lower-left (0) clockwise over the top to lower-right (100) and the
 * readout nests inside the opening.
 */

const SWEEP = 240;
const START = 90 + (360 - SWEEP) / 2;   // 150deg: end of the bottom gap
const END   = START + SWEEP;            // 390deg == 30deg, mirrored on the right

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const a = polar(cx, cy, r, fromDeg);
  const b = polar(cx, cy, r, toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

export type GaugePalette = {
  track:   string;
  gap:     string;   // tick colour, matches the surface behind the arc
  surface: string;   // pivot fill
  muted:   string;
  text:    string;
};

type Props = {
  score:    number | null;
  color:    string;
  size?:    number;
  palette:  GaugePalette;
  /** Distinguishes gradient ids when more than one gauge is in the DOM. */
  idSuffix: string;
};

export function MacroGaugeSvg({ score, color, size = 300, palette, idSuffix }: Props) {
  const w  = size;
  const h  = Math.round(size * 0.84);
  const cx = w / 2;
  const cy = w / 2;
  const r  = w / 2 - 22;

  const pct      = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const valueDeg = START + SWEEP * pct;

  const needle    = polar(cx, cy, r - 26, valueDeg);
  const needleTip = polar(cx, cy, r - 8,  valueDeg);
  const zeroEnd   = polar(cx, cy, r, START);
  const fullEnd   = polar(cx, cy, r, END);

  const gradId = `macro-gauge-${idSuffix}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Macro Risk Score ${score ?? 'unavailable'} out of 100`}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#35D07F" />
          <stop offset="33%"  stopColor="#E6B450" />
          <stop offset="66%"  stopColor="#F97316" />
          <stop offset="100%" stopColor="#FF5C5C" />
        </linearGradient>
      </defs>

      <path d={arcPath(cx, cy, r, START, END)} fill="none"
        stroke={palette.track} strokeWidth={16} strokeLinecap="round" />

      <path d={arcPath(cx, cy, r, START, END)} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={16} strokeLinecap="round"
        opacity={score == null ? 0.2 : 0.95} />

      {/* Band boundaries at 25 / 50 / 75 */}
      {[25, 50, 75].map(t => {
        const d  = START + SWEEP * (t / 100);
        const p1 = polar(cx, cy, r - 9, d);
        const p2 = polar(cx, cy, r + 9, d);
        return <line key={t} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke={palette.gap} strokeWidth={2} />;
      })}

      {score != null && (
        <>
          <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
            stroke={color} strokeWidth={4} strokeLinecap="round" />
          <circle cx={needleTip.x} cy={needleTip.y} r={5} fill={color} />
          <circle cx={cx} cy={cy} r={8} fill={palette.surface} stroke={color} strokeWidth={3} />
        </>
      )}

      {/* Scale ends, sitting just below each lower terminus */}
      <text x={zeroEnd.x} y={zeroEnd.y + 20} fontSize={11} fill={palette.muted}
        textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">0</text>
      <text x={fullEnd.x} y={fullEnd.y + 20} fontSize={11} fill={palette.muted}
        textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">100</text>

      {/* Readout, nested in the opening */}
      <text x={cx} y={cy + 2} fontSize={11} fill={palette.muted} textAnchor="middle"
        letterSpacing="3" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        MACRO RISK
      </text>
      <text x={cx} y={cy + 48} fontSize={52} fontWeight={700} fill={color} textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {score ?? '—'}
        <tspan fontSize={20} fontWeight={400} fill={palette.muted}>/100</tspan>
      </text>
      <text x={cx} y={cy + 74} fontSize={15} fontWeight={600} fill={color} textAnchor="middle"
        letterSpacing="1.5">
        {riskBand(score)}
      </text>
    </svg>
  );
}

export const LIVE_GAUGE_PALETTE: GaugePalette = {
  track:   'var(--sct-border)',
  gap:     'var(--sct-bg)',
  surface: 'var(--sct-card)',
  muted:   'var(--sct-muted)',
  text:    'var(--sct-text)',
};

export const CARD_GAUGE_PALETTE: GaugePalette = {
  track:   '#21262D',
  gap:     '#0D1117',
  surface: '#161B22',
  muted:   '#8B949E',
  text:    '#F7F9FC',
};
