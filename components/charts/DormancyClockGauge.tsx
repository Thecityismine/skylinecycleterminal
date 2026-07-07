"use client";

type Props = {
  years: number;
  maxYears?: number;
  size?: number;
};

// Semicircle gauge, 180° sweep, red (young/active) -> green (old/dormant)
export function DormancyClockGauge({ years, maxYears = 5, size = 220 }: Props) {
  const w = size;
  const h = size * 0.62;
  const cx = w / 2;
  const cy = h - 8;
  const r = w / 2 - 16;

  const clamped = Math.max(0, Math.min(years, maxYears));
  const frac = clamped / maxYears;
  const angleDeg = 180 - frac * 180; // 180deg at 0 (left), 0deg at max (right)
  const angleRad = (angleDeg * Math.PI) / 180;

  const needleLen = r - 10;
  const needleX = cx + needleLen * Math.cos(angleRad);
  const needleY = cy - needleLen * Math.sin(angleRad);

  const arcId = 'dormancy-gauge-gradient';

  // Arc path (semicircle from 180deg to 0deg, i.e. left to right along the top)
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h + 4} viewBox={`0 0 ${w} ${h + 4}`}>
        <defs>
          <linearGradient id={arcId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF5C5C" />
            <stop offset="50%" stopColor="#E6B450" />
            <stop offset="100%" stopColor="#35D07F" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke={`url(#${arcId})`}
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="var(--sct-text)" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="var(--sct-text)" />

        {/* Scale labels */}
        <text x={startX} y={cy + 16} fontSize={9} fill="var(--sct-muted)" textAnchor="middle" fontFamily="monospace">0y</text>
        <text x={endX} y={cy + 16} fontSize={9} fill="var(--sct-muted)" textAnchor="middle" fontFamily="monospace">{maxYears}y</text>
      </svg>

      <div className="text-center -mt-1">
        <p className="text-3xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{years.toFixed(2)}<span className="text-base">y</span></p>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Average Coin Age</p>
      </div>
    </div>
  );
}
