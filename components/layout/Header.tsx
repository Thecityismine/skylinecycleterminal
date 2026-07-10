"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApiData } from '@/lib/hooks/useApiData';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

type MarketSnapshot = {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
  btcDominance: number;
  fearGreedValue: number;
  fearGreedLabel: string;
};

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtChange(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function Header({ onMenuClick, email }: { onMenuClick?: () => void; email?: string | null }) {
  const { data: market } = useApiData<MarketSnapshot>('/api/market');
  const { data: cycle }  = useApiData<CycleScoreResult>('/api/cycle');
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }, [router]);

  const tickers = [
    {
      label: 'BTC',
      value:  market ? fmtUSD(market.btcPrice) : '—',
      change: market?.btcChange24h ?? null,
      color:  'var(--sct-btc)',
    },
    {
      label: 'ETH',
      value:  market ? fmtUSD(market.ethPrice) : '—',
      change: market?.ethChange24h ?? null,
      color:  'var(--sct-eth)',
    },
    {
      label: 'BTC.D',
      value:  market ? `${market.btcDominance.toFixed(1)}%` : '—',
      change: null,
      color:  'var(--sct-secondary)',
    },
  ];

  const fgValue = market ? `${market.fearGreedValue} · ${market.fearGreedLabel}` : '—';

  const regime = cycle
    ? { label: cycle.zoneLabel, color: cycle.zoneColor }
    : { label: 'Loading…', color: 'var(--sct-blue)' };

  return (
    <header
      className="h-16 shrink-0 sticky top-0 z-30 flex items-center justify-between px-8 border-b backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(9,13,19,0.85)',
        borderColor: 'var(--sct-border)',
      }}
    >
      {/* Left: hamburger (mobile) + live price tickers */}
      <div className="flex items-center gap-3 md:gap-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-md transition-colors"
          style={{ color: 'var(--sct-muted)' }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {tickers.map((t, i) => (
          <div
            key={t.label}
            className={cn(
              "flex items-center gap-2",
              // BTC always visible; ETH + BTC.D hidden on small screens
              i > 0 ? "hidden sm:flex" : "flex"
            )}
          >
            <span className="text-xs font-medium tracking-wider" style={{ color: 'var(--sct-muted)' }}>
              {t.label}
            </span>
            <span className="text-sm font-mono font-semibold" style={{ color: t.color }}>
              {t.value}
            </span>
            {t.change != null && (
              <span
                className="text-xs font-mono"
                style={{ color: t.change >= 0 ? 'var(--sct-green)' : 'var(--sct-red)' }}
              >
                {fmtChange(t.change)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Right: F&G + regime badge + status dot */}
      <div className="flex items-center gap-5">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs tracking-wider" style={{ color: 'var(--sct-muted)' }}>
            F&amp;G
          </span>
          <span className="text-sm font-mono" style={{ color: 'var(--sct-secondary)' }}>
            {fgValue}
          </span>
        </div>

        {/* Cycle zone badge */}
        <span
          className="px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wider uppercase border transition-colors duration-500"
          style={{
            backgroundColor: `${regime.color}18`,
            borderColor:     `${regime.color}40`,
            color:            regime.color,
          }}
        >
          {regime.label}
        </span>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: market ? 'var(--sct-green)' : 'var(--sct-amber)' }}
          />
          <span className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
            {market ? 'Live' : 'Connecting…'}
          </span>
        </div>

        {/* Account menu */}
        {email && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors"
              style={{ color: 'var(--sct-secondary)' }}
            >
              <span className="hidden md:inline text-xs font-mono max-w-[140px] truncate">{email}</span>
              <ChevronDown size={14} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-2 z-50 rounded-md border shadow-xl py-1 min-w-[160px]"
                  style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
                >
                  <button
                    onClick={() => void handleSignOut()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-left transition-colors"
                    style={{ color: 'var(--sct-muted)' }}
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
