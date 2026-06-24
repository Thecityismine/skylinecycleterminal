# Skyline Cycle Terminal — Page & Component Standards

Reference for building new pages consistently. All values are sourced from production code.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Layout Shell](#2-layout-shell)
3. [Design Tokens](#3-design-tokens)
4. [Color Palette](#4-color-palette)
5. [Page Anatomy](#5-page-anatomy)
6. [Shared Components](#6-shared-components)
7. [Chart Standards](#7-chart-standards)
8. [Drag-to-Zoom](#8-drag-to-zoom)
9. [Button Standards](#9-button-standards)
10. [Share Card Standard](#10-share-card-standard)
11. [Share Modal Standard](#11-share-modal-standard)
12. [API & Data Patterns](#12-api--data-patterns)
13. [Sidebar Navigation](#13-sidebar-navigation)
14. [New Page Checklist](#14-new-page-checklist)

---

## 1. Project Structure

```
app/
  price/<name>/page.tsx     — Server component, fetches data
  price/<name>/route.ts     — API route (if client-side fetching)
components/
  charts/<Name>Chart.tsx    — Pure chart component
  charts/<Name>ChartSection.tsx  — Client wrapper (range state, share payload)
  share/<Name>ShareCard.tsx — Static card for export (no ResponsiveContainer)
  share/<Name>ShareModal.tsx — Modal wrapper (standard, rarely changes)
  dashboard/PageHeader.tsx  — Page title component
  dashboard/StatCard.tsx    — Metric card component
lib/
  hooks/useApiData.ts       — Client-side data fetching hook
  hooks/useChartZoom.ts     — Drag-to-zoom hook
  share/exportShareCard.ts  — PNG export utilities
  api/coinmetrics.ts        — CoinMetrics data fetcher
```

---

## 2. Layout Shell

The `LayoutShell` wraps all pages and provides:
- Left sidebar: `w-[260px]`, `lg:ml-[260px]` offset on main content
- `<main>` padding: **`p-4 md:p-6 lg:p-8`** — do NOT add extra padding at the page level

**Every page outer wrapper:**
```tsx
<div className="max-w-[1400px] mx-auto space-y-6">
  {/* page content */}
</div>
```

---

## 3. Design Tokens

All defined in `app/globals.css`. Always use CSS variables — never hardcode these values in page/component files.

| Token | Value | Use |
|---|---|---|
| `--sct-bg` | `#090D13` | Page background |
| `--sct-panel` | `#111821` | Sidebar / panel background |
| `--sct-card` | `#151E29` | Card / chart container background |
| `--sct-border` | `#263241` | Borders, inactive button bg |
| `--sct-border-soft` | `rgba(255,255,255,0.08)` | Subtle borders |
| `--sct-text` | `#F3F6FA` | Primary text, active button text |
| `--sct-secondary` | `#A9B4C0` | Secondary text |
| `--sct-muted` | `#6F7A86` | Muted / hint text, axis ticks |
| `--sct-btc` | `#F7931A` | BTC orange, CTA buttons |
| `--sct-eth` | `#7C8CFF` | ETH purple |
| `--sct-green` | `#35D07F` | Bullish / positive |
| `--sct-red` | `#FF5C5C` | Bearish / negative |
| `--sct-amber` | `#E6B450` | Caution / 50D MA |
| `--sct-blue` | `#3B82F6` | Informational / 200D MA |

---

## 4. Color Palette

### Chart line colors
```ts
const PRICE = '#F5F7FA';   // BTC price — off-white hero line
const GOLD  = '#EAB84D';   // 50D MA / short-term trend
const BLUE  = '#5B84FF';   // 200D MA / long-term floor
const GREEN = '#35D07F';   // Bullish signal / golden cross
const RED   = '#F85149';   // Bearish signal / death cross
const BTC   = '#F7931A';   // Bitcoin orange
```

### Share card fixed colors (not CSS vars — share cards render off-screen)
```ts
'#0D1117'  // card background
'#161B22'  // stats strip card background
'#21262D'  // stats strip card border / pill background
'#F7F9FC'  // primary text on card
'#8B949E'  // muted text on card
'#484F58'  // dim sub-label on card
'#6B7280'  // footer disclaimer text
'#35D07F'  // LIVE DATA dot
```

---

## 5. Page Anatomy

```tsx
// app/price/my-indicator/page.tsx — Server Component
export const revalidate = 86400; // 24-hour ISR cache

export default async function MyIndicatorPage() {
  const data = await fetchMyData();

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      
      {/* 1. Page header */}
      <PageHeader
        title="My Indicator"
        subtitle="Short description of what this measures"
      />

      {/* 2. Status / hero banner (optional) */}
      <div className="rounded-xl border px-5 py-4" style={{
        backgroundColor: 'var(--sct-card)',
        borderColor: signalColor,
      }}>
        ...
      </div>

      {/* 3. Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="BTC Price" value="$..." sub="Latest close" accent="var(--sct-text)" freshness="daily" />
        ...
      </div>

      {/* 4. Main chart card */}
      <MyIndicatorChartSection data={data} ... />

      {/* 5. Bottom row — table + explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        ...
      </div>

    </div>
  );
}
```

---

## 6. Shared Components

### PageHeader
```tsx
import { PageHeader } from '@/components/dashboard/PageHeader';

<PageHeader
  title="Page Title"
  subtitle="One-line description"
/>
```

### StatCard
```tsx
import { StatCard } from '@/components/dashboard/StatCard';

<StatCard
  label="Metric Name"
  value="$62,500"
  sub="Sublabel / context"
  accent="#F7931A"         // color for the value
  freshness="daily"        // 'daily' | 'weekly' | 'realtime' — shows update cadence badge
/>
```

### Card wrapper (consistent border/bg)
```tsx
<div
  className="rounded-xl border p-5"
  style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
>
```

---

## 7. Chart Standards

### Chart component structure
```tsx
// components/charts/MyChart.tsx
"use client";

export function MyChart({ data, onRangeChange, onZoomChange }: Props) {
  const [range, setRange] = useState<Range>('All');
  const { domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers } = useChartZoom<number>();

  // Notify parent of zoom changes
  useEffect(() => { onZoomChange?.(domain); }, [domain, onZoomChange]);

  const displayed = useMemo(() => filterByRange(data, range), [data, range]);
  const chartData = useMemo(() => {
    if (!domain) return displayed;
    return displayed.filter(d => d.ts >= domain.start && d.ts <= domain.end);
  }, [displayed, domain]);

  return (
    <div>
      {/* Range buttons + zoom controls */}
      ...

      {/* Chart wrapper */}
      <div style={{ position: 'relative', width: '100%', height: 440,
        cursor: isSelecting ? 'crosshair' : 'default', userSelect: 'none' }}
        onMouseLeave={cancel}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} {...chartHandlers}>
            ...
          </ComposedChart>
        </ResponsiveContainer>
        <ChartWatermark />
      </div>
    </div>
  );
}
```

### Grid
```tsx
// Live charts
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

// Share cards
<CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />
```

### Axes
```tsx
// X axis — string dates
<XAxis dataKey="date" tickFormatter={fmtXTick}
  tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
  axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} minTickGap={80} />

// X axis — numeric timestamps
<XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
  ticks={yearTicks}
  tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
  tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
  axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} />

// Year ticks helper
const YEAR_TICKS = Array.from({ length: 20 }, (_, i) =>
  new Date(`${2011 + i}-01-01T00:00:00Z`).getTime()
);

// Y axis
<YAxis scale={logScale ? 'log' : 'linear'} domain={['auto', 'auto']} allowDataOverflow
  tickFormatter={fmtPrice}
  tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
  axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} width={64} />
```

### Tooltip
```tsx
<Tooltip
  content={<CustomTooltip />}
  cursor={isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }}
/>

// Tooltip card style
<div className="rounded-lg border px-3 py-2.5 shadow-xl space-y-1"
  style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 180 }}>
```

### Watermark
```tsx
import { ChartWatermark } from '@/components/charts/ChartWatermark';

// Place inside the wrapper div, after ResponsiveContainer
<ChartWatermark />
```

### Chart heights
| Use | Height |
|---|---|
| Main price chart | `440px` |
| Secondary / oscillator panel | `160–200px` |
| Full-page hero chart | `500px` |

---

## 8. Drag-to-Zoom

Every chart gets drag-to-zoom. The hook is generic — use `string` for date-keyed charts and `number` for timestamp-keyed charts.

```tsx
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

// String date x-axis (dataKey="date" or "time")
const zoom = useChartZoom<string>();
// filter: d.date >= domain.start && d.date <= domain.end

// Numeric timestamp x-axis (dataKey="ts", type="number")
const zoom = useChartZoom<number>();
// filter: d.ts >= domain.start && d.ts <= domain.end
```

### Selection rectangle (render before zone ReferenceAreas)
```tsx
{selectionArea && (
  <ReferenceArea
    x1={selectionArea.x1}
    x2={selectionArea.x2}
    fill="rgba(255,255,255,0.06)"
    stroke="rgba(255,255,255,0.25)"
    strokeWidth={1}
  />
)}
```

### Reset Zoom button (always paired with range buttons)
```tsx
{isZoomed && (
  <button onClick={reset} className="px-3 py-1 rounded text-xs font-mono border transition-all"
    style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}>
    Reset Zoom
  </button>
)}
{!isZoomed && (
  <span className="hidden md:inline text-[10px] font-mono ml-1"
    style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
    drag to zoom
  </span>
)}
```

### Section wrapper — zoom → share payload
```tsx
const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);

const shareData = useMemo(() => {
  if (!zoomDomain) return displayed;
  return displayed.filter(d => d.ts >= zoomDomain.start && d.ts <= zoomDomain.end);
}, [displayed, zoomDomain]);

const shareRange = zoomDomain
  ? `${fmt(zoomDomain.start)} – ${fmt(zoomDomain.end)}`
  : range;

// Pass to chart:
<MyChart onZoomChange={setZoomDomain} onRangeChange={(r) => { setRange(r); setZoomDomain(null); }} />
// Pass shareData to share payload, not displayed
```

---

## 9. Button Standards

### Range / toggle buttons
```tsx
<button
  onClick={() => { setRange(r); reset(); }}
  className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
  style={{
    backgroundColor: isActive ? 'var(--sct-border)' : 'transparent',
    borderColor:     'var(--sct-border)',
    color:           isActive ? 'var(--sct-text)' : 'var(--sct-muted)',
  }}
>
  {r}
</button>
```

### Share / action button
```tsx
import { ImageDown } from 'lucide-react';

const [hovered, setHovered] = useState(false);

<button
  onClick={() => setShowShareModal(true)}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
  style={{
    backgroundColor: 'transparent',
    borderColor:     'var(--sct-border)',
    color:           hovered ? '#F7931A' : 'var(--sct-muted)',
  }}
>
  <ImageDown size={13} />
  Share Card
</button>
```

---

## 10. Share Card Standard

**Canonical reference:** `components/share/WeeklySMAShareCard.tsx`

### Dimensions
```ts
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
// SHARE_CARD_WIDTH  = 1200
// SHARE_CARD_HEIGHT = 675
// Export PNG: 2400×1350 (EXPORT_SCALE = 2)
```

### Layout constants
```ts
const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
// CHART_H = 675 - 32 - 72 - 8 - 68 - 8 - 24 - 32 = 431
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;
// CHART_W = 1136

// Chart rect — for watermark compositor
export const MY_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};
```

### Outer wrapper
```tsx
<div style={{
  width:           SHARE_CARD_WIDTH,
  height:          SHARE_CARD_HEIGHT,
  backgroundColor: '#0D1117',
  position:        'relative',
  overflow:        'hidden',
  fontFamily:      'ui-monospace, SFMono-Regular, Menlo, monospace',
  display:         'flex',
  flexDirection:   'column',
  padding:         PAD,
  boxSizing:       'border-box',
}}>
```

### Header (HEADER_H = 72)
```tsx
<div style={{ height: HEADER_H, flex: `0 0 ${HEADER_H}px`, display: 'flex',
  alignItems: 'flex-start', justifyContent: 'space-between' }}>
  {/* Left: title + subtitle */}
  <div>
    <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>Page Title</p>
    <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>Subtitle · {range}</p>
  </div>
  {/* Right: LIVE DATA dot + date + pills */}
  <div style={{ textAlign: 'right', flexShrink: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
      <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
    </div>
    <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
      <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
        {range}
      </span>
      {/* Optional signal pill */}
      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
        backgroundColor: signalColor + '20', color: signalColor }}>
        {signalLabel}
      </span>
    </div>
  </div>
</div>
```

### Stats strip (STATS_H = 68)
```tsx
{/* 4 stats, each { label, value, sub, color } */}
<div style={{ height: STATS_H, flex: `0 0 ${STATS_H}px`, display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: GAP, marginBottom: GAP }}>
  {stats.map(s => (
    <div key={s.label} style={{ backgroundColor: '#161B22', border: '1px solid #21262D',
      borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
      <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
    </div>
  ))}
</div>
```

### Chart (CHART_H = 431, CHART_W = 1136)
```tsx
<div style={{ flex: '0 0 auto' }}>
  <ComposedChart data={data} width={CHART_W} height={CHART_H}
    margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />
    {/* NO ResponsiveContainer — share cards use fixed pixel dimensions */}
    {/* NO Tooltip — share cards are static */}
    {/* NO animation — isAnimationActive={false} on all series */}
    ...
  </ComposedChart>
</div>
```

### Footer (FOOTER_H = 24)
```tsx
<div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
  {/* Left: line legend */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    {[
      { color: '#F5F7FA', label: 'Price' },
      { color: '#EAB84D', label: '50D MA' },
    ].map(l => (
      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 16, height: 2, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
        <span style={{ fontSize: 10, color: '#8B949E' }}>{l.label}</span>
      </div>
    ))}
  </div>
  {/* Right: disclaimer */}
  <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
    Generated from Skyline Cycle Terminal · Not financial advice
  </span>
</div>
```

---

## 11. Share Modal Standard

Copy an existing modal (e.g. `WeeklySMAShareModal.tsx`) and update the card component references. The modal structure never changes — only the card component and filename differ.

Key constants:
```ts
const PREVIEW_SCALE = 0.42;  // modal preview size
```

The modal auto-generates on open (300ms delay after logo loads), supports Download, Copy, Share (Web Share API), and Regenerate.

---

## 12. API & Data Patterns

### Server component — direct fetch
```ts
// app/price/my-indicator/page.tsx
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
export const revalidate = 86400;

export default async function Page() {
  const daily = await fetchBTCDailyPrice('2012-01-01');
  // daily: Array<{ time: string; price: number }>
}
```

### Client component — API route
```ts
// app/api/price/my-indicator/route.ts
export const revalidate = 86400;
export async function GET() {
  const data = await fetchBTCDailyPrice('2012-01-01');
  return Response.json({ ... });
}

// Component
import { useApiData } from '@/lib/hooks/useApiData';
const { data, loading, error } = useApiData<ApiResponse>('/api/price/my-indicator');
```

---

## 13. Sidebar Navigation

Add new pages to `components/layout/Sidebar.tsx` under the appropriate section:

```ts
// In the nav array, under the correct section:
{ label: "My Indicator", href: "/price/my-indicator", icon: TrendingUp },
```

Available sections: `CYCLE`, `PRICE`, `ON-CHAIN`, `MARKET STRUCTURE`, `MACRO`, `EQUITIES`, `TOOLS`

Icons from `lucide-react`. Commonly used: `TrendingUp`, `TrendingDown`, `Activity`, `BarChart2`, `BarChart3`, `CalendarDays`, `Waves`, `Zap`, `Crosshair`, `Radar`.

---

## 14. New Page Checklist

- [ ] Create `app/price/<name>/page.tsx` — server component, `revalidate = 86400`
- [ ] Create `components/charts/<Name>Chart.tsx` — chart with `useChartZoom`, `onZoomChange` prop
- [ ] Create `components/charts/<Name>ChartSection.tsx` — range state, zoom state, share payload
- [ ] Create `components/share/<Name>ShareCard.tsx` — matches WeeklySMA layout (PAD/HEADER_H/STATS_H/GAP/FOOTER_H/CHART_H)
- [ ] Create `components/share/<Name>ShareModal.tsx` — copy existing modal, update card component
- [ ] Add `MY_CARD_CHART_RECT` export from share card
- [ ] Page outer wrapper: `max-w-[1400px] mx-auto space-y-6` — no extra padding
- [ ] Use `PageHeader` for title/subtitle
- [ ] Use `StatCard` for metric grid
- [ ] Range buttons follow button standard (active = `var(--sct-border)` bg, inactive = transparent)
- [ ] Share button: `ImageDown` icon, transparent, `#F7931A` hover
- [ ] Chart: `ChartWatermark` inside wrapper div, `isAnimationActive={false}` on all series
- [ ] Drag-to-zoom wired: `useChartZoom<T>()`, `selectionArea` ReferenceArea, Reset Zoom button, "drag to zoom" hint hidden on mobile (`hidden md:inline`)
- [ ] Share card chart: `ComposedChart` (no `ResponsiveContainer`), `isAnimationActive={false}`, no `Tooltip`
- [ ] Share card mirrors every visual element from the live chart (zone lines, reference areas, etc.)
- [ ] Add to `Sidebar.tsx` under correct section
- [ ] TypeScript strict — `tsc --noEmit` passes with zero errors
