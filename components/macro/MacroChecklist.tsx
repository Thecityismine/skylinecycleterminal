import type { ChecklistItem } from '@/lib/indicators/macroNarrative';

export function MacroChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--sct-muted)' }}>
        Macro Checklist
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map(item => (
          <div
            key={item.label}
            className="rounded-lg border px-3 py-3 flex flex-col items-center text-center gap-2"
            style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}66` }}
            />
            <span className="text-[11px] font-medium leading-tight" style={{ color: 'var(--sct-text)' }}>
              {item.label}
            </span>
            <span className="text-[10px] font-mono leading-tight" style={{ color: item.color }}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
