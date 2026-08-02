import { riskBand } from '@/lib/indicators/macroRisk';

type Props = {
  score: number | null;
  color: string;
  size?: number;
};

const SWEEP = 240;          // degrees of arc
const START = 180 + (360 - SWEEP) / 2;   // 240° arc centred on vertical

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

export function MacroRiskGauge({ score, color, size = 300 }: Props) {
  const w  = size;
  const h  = size * 0.78;
  const cx = w / 2;
  const cy = h * 0.66;
  const r  = w / 2 - 22;

  const pct      = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const endDeg   = START + SWEEP;
  const valueDeg = START + SWEEP * pct;

  const needle    = polar(cx, cy, r - 26, valueDeg);
  const needleTip = polar(cx, cy, r - 8,  valueDeg);

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img"
        aria-label={`Macro Risk Score ${score ?? 'unavailable'} out of 100`}>
        <defs>
          <linearGradient id="macro-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#35D07F" />
            <stop offset="33%"  stopColor="#E6B450" />
            <stop offset="66%"  stopColor="#F97316" />
            <stop offset="100%" stopColor="#FF5C5C" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path d={arcPath(cx, cy, r, START, endDeg)} fill="none"
          stroke="var(--sct-border)" strokeWidth={16} strokeLinecap="round" />

        {/* Coloured scale */}
        <path d={arcPath(cx, cy, r, START, endDeg)} fill="none"
          stroke="url(#macro-gauge-grad)" strokeWidth={16} strokeLinecap="round"
          opacity={score == null ? 0.2 : 0.95} />

        {/* Band ticks at 25 / 50 / 75 */}
        {[25, 50, 75].map(t => {
          const d  = START + SWEEP * (t / 100);
          const p1 = polar(cx, cy, r - 9,  d);
          const p2 = polar(cx, cy, r + 9,  d);
          return <line key={t} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke="var(--sct-bg)" strokeWidth={2} />;
        })}

        {/* Needle */}
        {score != null && (
          <>
            <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
              stroke={color} strokeWidth={4} strokeLinecap="round" />
            <circle cx={needleTip.x} cy={needleTip.y} r={5} fill={color} />
            <circle cx={cx} cy={cy} r={8} fill="var(--sct-card)" stroke={color} strokeWidth={3} />
          </>
        )}

        {/* Scale ends */}
        <text x={polar(cx, cy, r, START).x - 4} y={polar(cx, cy, r, START).y + 24}
          fontSize={10} fill="var(--sct-muted)" textAnchor="middle" fontFamily="monospace">0</text>
        <text x={polar(cx, cy, r, endDeg).x + 4} y={polar(cx, cy, r, endDeg).y + 24}
          fontSize={10} fill="var(--sct-muted)" textAnchor="middle" fontFamily="monospace">100</text>
      </svg>

      <div className="text-center -mt-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--sct-muted)' }}>
          Macro Risk
        </p>
        <p className="text-6xl font-mono font-bold leading-none mt-1" style={{ color }}>
          {score ?? '—'}
          {score != null && (
            <span className="text-2xl font-normal" style={{ color: 'var(--sct-muted)' }}> /100</span>
          )}
        </p>
        <p className="text-lg font-semibold tracking-wide mt-1.5" style={{ color }}>
          {riskBand(score)}
        </p>
      </div>
    </div>
  );
}
