"use client";

import { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

type Props = { children: React.ReactNode; email?: string | null };

export function LayoutShell({ children, email }: Props) {
  const [open, setOpen] = useState(false);
  const close  = useCallback(() => setOpen(false),  []);
  const toggle = useCallback(() => setOpen(v => !v), []);

  return (
    <>
      <Sidebar isOpen={open} onClose={close} />

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Main column */}
      <div className="flex flex-col h-screen lg:ml-[260px]">
        <Header onMenuClick={toggle} email={email} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </>
  );
}
