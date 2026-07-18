type Props = {
  summary:     string;
  rating:      number;
  ratingLabel: string;
  color:       string;
};

export function RotationStatusBanner({ summary, rating, ratingLabel, color }: Props) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex-1">
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--sct-muted)' }}>
          Current Read
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>{summary}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-3xl font-mono font-bold" style={{ color }}>{rating}</span>
        <div className="flex flex-col">
          <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>/ 100</span>
          <span className="text-sm font-semibold" style={{ color }}>{ratingLabel}</span>
        </div>
      </div>
    </div>
  );
}
