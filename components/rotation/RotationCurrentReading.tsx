import { RotationScoreBadge } from './RotationScoreBadge';

type Props = {
  label:        string;
  color:        string;
  score:        number;
  description?: string;
};

export function RotationCurrentReading({ label, color, score, description }: Props) {
  return (
    <div
      className="rounded-xl border px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: color, borderLeftWidth: 4 }}
    >
      <div>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
          Current Reading
        </p>
        <p className="text-lg font-bold" style={{ color }}>{label}</p>
        {description && (
          <p className="text-xs mt-1 max-w-xl" style={{ color: 'var(--sct-muted)' }}>{description}</p>
        )}
      </div>
      <RotationScoreBadge score={score} label="Rotation Score" color={color} />
    </div>
  );
}
