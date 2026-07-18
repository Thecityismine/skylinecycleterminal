"use client";

export type RotationRange = '2Y' | '4Y' | '8Y' | 'All';
export type RotationTimeframe = 'Weekly' | 'Daily';
export type MAPeriod = 50 | 100 | 200;

const RANGES: RotationRange[] = ['2Y', '4Y', '8Y', 'All'];
const MA_OPTIONS: MAPeriod[] = [50, 100, 200];

function ToggleButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
      style={{
        backgroundColor: active ? 'var(--sct-border)' : 'transparent',
        borderColor:     'var(--sct-border)',
        color:           active ? 'var(--sct-text)' : 'var(--sct-muted)',
      }}
    >
      {children}
    </button>
  );
}

type Props = {
  range:          RotationRange;
  onRangeChange:  (r: RotationRange) => void;
  logScale:       boolean;
  onLogScaleChange: (v: boolean) => void;
  timeframe:      RotationTimeframe;
  onTimeframeChange: (t: RotationTimeframe) => void;
  ma:             MAPeriod;
  onMAChange:     (ma: MAPeriod) => void;
  isZoomed:       boolean;
  onResetZoom:    () => void;
};

export function RotationToolbar({
  range, onRangeChange, logScale, onLogScaleChange,
  timeframe, onTimeframeChange, ma, onMAChange,
  isZoomed, onResetZoom,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <ToggleButton key={r} active={range === r} onClick={() => onRangeChange(r)}>{r}</ToggleButton>
        ))}
      </div>

      <div className="flex gap-1">
        <ToggleButton active={!logScale} onClick={() => onLogScaleChange(false)}>Linear</ToggleButton>
        <ToggleButton active={logScale} onClick={() => onLogScaleChange(true)}>Log</ToggleButton>
      </div>

      <div className="flex gap-1">
        <ToggleButton active={timeframe === 'Weekly'} onClick={() => onTimeframeChange('Weekly')}>Weekly</ToggleButton>
        <ToggleButton active={timeframe === 'Daily'} onClick={() => onTimeframeChange('Daily')}>Daily</ToggleButton>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>Show MA</span>
        <select
          value={ma}
          onChange={(e) => onMAChange(Number(e.target.value) as MAPeriod)}
          className="px-2 py-1 rounded text-xs font-mono border outline-none"
          style={{ backgroundColor: 'transparent', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
        >
          {MA_OPTIONS.map((m) => (
            <option key={m} value={m} style={{ backgroundColor: 'var(--sct-card)' }}>{m}W</option>
          ))}
        </select>
      </div>

      {isZoomed ? (
        <button
          onClick={onResetZoom}
          className="px-3 py-1 rounded text-xs font-mono border transition-all"
          style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}
        >
          Reset Zoom
        </button>
      ) : (
        <span className="hidden md:inline text-[10px] font-mono ml-1" style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
          drag to zoom
        </span>
      )}
    </div>
  );
}
