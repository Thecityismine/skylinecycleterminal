"use client";

import { Printer } from 'lucide-react';

export function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono border transition-all"
      style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
    >
      <Printer size={13} />
      Print / Save as PDF
    </button>
  );
}
