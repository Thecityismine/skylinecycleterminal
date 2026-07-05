"use client";

export type CalendarAsset = 'btc' | 'eth';

type TabDef = {
  key:      string;
  label:    string;
  soon?:    boolean;
};

const TABS: TabDef[] = [
  { key: 'btc',      label: 'BTC' },
  { key: 'eth',      label: 'ETH' },
  { key: 'total2',   label: 'TOTAL2',   soon: true },
  { key: 'total3',   label: 'TOTAL3',   soon: true },
  { key: 'others',   label: 'OTHERS',   soon: true },
  { key: 'total50',  label: 'TOTAL50',  soon: true },
  { key: 'total100', label: 'TOTAL100', soon: true },
];

type Props = {
  active:   CalendarAsset;
  onChange: (asset: CalendarAsset) => void;
};

export function AssetTabs({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            disabled={tab.soon}
            onClick={() => !tab.soon && onChange(tab.key as CalendarAsset)}
            title={tab.soon ? 'Coming soon — pending historical market-cap data source' : undefined}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all duration-150 relative"
            style={{
              backgroundColor: isActive ? 'var(--sct-border)' : 'transparent',
              borderColor:     isActive ? '#F7931A' : 'var(--sct-border)',
              color:           isActive ? 'var(--sct-text)' : tab.soon ? 'var(--sct-muted)' : 'var(--sct-secondary)',
              opacity:         tab.soon ? 0.45 : 1,
              cursor:          tab.soon ? 'not-allowed' : 'pointer',
            }}
          >
            {tab.label}
            {tab.soon && (
              <span
                className="ml-1.5 text-[8px] align-middle tracking-wider"
                style={{ color: 'var(--sct-muted)' }}
              >
                SOON
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
