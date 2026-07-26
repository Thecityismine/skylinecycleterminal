import type { ReactNode } from 'react';

type Props = {
  title:    string;
  subtitle?: string;
  /** Keeps the section from being split across pages when printed. */
  children: ReactNode;
};

export function ReportSection({ title, subtitle, children }: Props) {
  return (
    <section
      className="rounded-xl border p-5 report-section"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <h2
        className="text-xs font-medium tracking-wider uppercase"
        style={{ color: 'var(--sct-muted)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--sct-muted)', opacity: 0.75 }}>
          {subtitle}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Meter({ value, color, label }: { value: number; color: string; label?: string }) {
  return (
    <div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--sct-border)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
        />
      </div>
      {label && (
        <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--sct-muted)' }}>{label}</p>
      )}
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
      {children}
    </p>
  );
}
