export function RotationScoreBadge({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-mono font-bold" style={{ color }}>{score}</span>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>/100</span>
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}
