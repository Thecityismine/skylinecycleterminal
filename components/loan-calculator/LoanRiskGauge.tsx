"use client";

type Props = {
  score: number; // 0-100
  label: string;
  color: string;
  size?: number;
};

// Semicircle gauge, 180deg sweep, green (low risk) -> red (critical) — mirrors
// components/charts/RiskGauge.tsx's technique but for the 0-100 loan risk scale.
export function LoanRiskGauge({ score, label, color, size = 220 }: Props) {
  const w = size;
  const h = size * 0.62;
  const cx = w / 2;
  const cy = h - 8;
  const r  = w / 2 - 16;

  const clamped = Math.max(0, Math.min(100, score));
  const angleDeg = 180 - (clamped / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;

  const needleLen = r - 10;
  const needleX = cx + needleLen * Math.cos(angleRad);
  const needleY = cy - needleLen * Math.sin(angleRad);

  const gradId = 'loan-risk-gauge-gradient';
  const startX = cx - r, startY = cy;
  const endX   = cx + r, endY   = cy;

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h + 4} viewBox={`0 0 ${w} ${h + 4}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#35D07F" />
            <stop offset="20%"  stopColor="#5B84FF" />
            <stop offset="40%"  stopColor="#EAB84D" />
            <stop offset="60%"  stopColor="#F7931A" />
            <stop offset="80%"  stopColor="#F85149" />
            <stop offset="100%" stopColor="#FF2D55" />
          </linearGradient>
        </defs>

        <path
          d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`}
          fill="none" stroke={`url(#${gradId})`} strokeWidth={10} strokeLinecap="round"
        />

        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="var(--sct-text)" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="var(--sct-text)" />

        <text x={startX} y={cy + 16} fontSize={9} fill="var(--sct-muted)" textAnchor="middle" fontFamily="monospace">0</text>
        <text x={endX} y={cy + 16} fontSize={9} fill="var(--sct-muted)" textAnchor="middle" fontFamily="monospace">100</text>
      </svg>

      <div className="text-center -mt-1">
        <p className="text-3xl font-mono font-bold" style={{ color }}>{Math.round(clamped)}</p>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>{label}</p>
      </div>
    </div>
  );
}
