"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Color LUT (built once at module load) ────────────────────────────────────
// Pre-blended over the dark background so inner render loops skip alpha math.

const BG_R = 6, BG_G = 14, BG_B = 26;
const LUT_SIZE = 1024;

const COLOR_LUT = (() => {
  // [position 0-1, [R, G, B, alpha 0-255]]
  const stops: Array<[number, [number, number, number, number]]> = [
    [0.000, [6,   14,  26,  0  ]],
    [0.040, [12,  35,  90,  90 ]],
    [0.150, [18,  80,  130, 155]],
    [0.300, [25,  115, 105, 190]],
    [0.500, [65,  148, 55,  215]],
    [0.680, [165, 168, 25,  232]],
    [0.850, [215, 192, 18,  244]],
    [1.000, [255, 232, 52,  255]],
  ];
  const lut = new Uint8Array(LUT_SIZE * 3);
  for (let i = 0; i < LUT_SIZE; i++) {
    const ratio = i / (LUT_SIZE - 1);
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let j = 0; j < stops.length - 1; j++) {
      if (ratio >= stops[j][0] && ratio <= stops[j + 1][0]) {
        lo = stops[j]; hi = stops[j + 1]; break;
      }
    }
    const t = hi[0] === lo[0] ? 1 : (ratio - lo[0]) / (hi[0] - lo[0]);
    const r = lo[1][0] + t * (hi[1][0] - lo[1][0]);
    const g = lo[1][1] + t * (hi[1][1] - lo[1][1]);
    const b = lo[1][2] + t * (hi[1][2] - lo[1][2]);
    const a = (lo[1][3] + t * (hi[1][3] - lo[1][3])) / 255;
    lut[i * 3]     = Math.round(BG_R * (1 - a) + r * a);
    lut[i * 3 + 1] = Math.round(BG_G * (1 - a) + g * a);
    lut[i * 3 + 2] = Math.round(BG_B * (1 - a) + b * a);
  }
  return lut;
})();

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'connecting' | 'syncing' | 'live' | 'error';

type DepthEvent = {
  e: 'depthUpdate';
  E: number;
  U: number; // first update ID in event
  u: number; // final update ID in event
  b: [string, string][];
  a: [string, string][];
};

type OrderBook = {
  bids: Map<number, number>;
  asks: Map<number, number>;
  lastUpdateId: number;
  ready: boolean;
  buffer: DepthEvent[];
};

type Snapshot = {
  ts: number;
  mid: number;
  levels: Map<number, number>; // binned price → total qty (bids + asks)
};

type TickerState = {
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  largestBidQty: number;
  largestBidPrice: number;
  largestAskQty: number;
  largestAskPrice: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

// Tried in round-robin order on each reconnect attempt.
// Port 443 avoids most firewall blocks; 9443 is the "canonical" Binance port.
// binance.us is the fallback for US-restricted IPs.
const WS_URLS = [
  'wss://stream.binance.com:443/ws/btcusdt@depth@100ms',
  'wss://stream.binance.com:9443/ws/btcusdt@depth@100ms',
  'wss://stream.binance.us:9443/ws/btcusdt@depth@100ms',
  'wss://stream.binance.us:443/ws/btcusdt@depth@100ms',
];

const WS_CONNECT_TIMEOUT_MS = 8_000; // abort silent TCP hangs fast
const SNAPSHOT_MS            = 500;
const MAX_SNAPSHOTS     = 3600; // 30 min at 500 ms
const NUM_PRICE_BINS    = 80;
const CANVAS_H          = 560;

const BIN_OPTIONS = [
  { label: '$10',  value: 10  },
  { label: '$50',  value: 50  },
  { label: '$100', value: 100 },
  { label: '$250', value: 250 },
  { label: '$500', value: 500 },
];

const WINDOW_OPTIONS = [
  { label: '5m',  value: 5  },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyDelta(book: OrderBook, evt: DepthEvent) {
  for (const [p, q] of evt.b) {
    const price = parseFloat(p), qty = parseFloat(q);
    if (qty === 0) book.bids.delete(price);
    else book.bids.set(price, qty);
  }
  for (const [p, q] of evt.a) {
    const price = parseFloat(p), qty = parseFloat(q);
    if (qty === 0) book.asks.delete(price);
    else book.asks.set(price, qty);
  }
  book.lastUpdateId = evt.u;
}

function mapMax(map: Map<number, number>): [number, number] {
  let maxQty = 0, maxPrice = 0;
  for (const [price, qty] of map) {
    if (qty > maxQty) { maxQty = qty; maxPrice = price; }
  }
  return [maxPrice, maxQty];
}

function fmtUSD(n: number): string {
  if (n >= 100_000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 1_000)   return `$${(n / 1000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtQty(q: number): string {
  if (q >= 1)   return `${q.toFixed(3)} BTC`;
  if (q >= 0.001) return `${(q * 1000).toFixed(2)} mBTC`;
  return `${(q * 100_000_000).toFixed(0)} sat`;
}

// ─── Canvas renderer ─────────────────────────────────────────────────────────

function renderHeatmap(
  canvas: HTMLCanvasElement,
  snapshots: Snapshot[],
  binSize: number,
  windowMs: number,
  status: Status,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = CANVAS_H;

  const cutoff  = Date.now() - windowMs;
  const visible = snapshots.filter((s) => s.ts >= cutoff);

  // Waiting state
  if (visible.length < 2) {
    ctx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#334155';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      status === 'connecting' ? 'Connecting to Binance…'
      : status === 'syncing'  ? 'Synchronizing order book snapshot…'
      : status === 'error'    ? 'Connection failed — all endpoints unreachable'
      : 'Collecting order book data…',
      W / 2, H / 2,
    );
    if (status === 'connecting') {
      ctx.fillStyle = '#1E293B';
      ctx.fillText('Trying multiple endpoints automatically', W / 2, H / 2 + 18);
    }
    return;
  }

  // Price window
  const latestMid  = visible.at(-1)!.mid;
  const priceRange = NUM_PRICE_BINS * binSize;
  const priceMin   = latestMid - priceRange * 0.5;
  const pixPerBin  = H / NUM_PRICE_BINS;

  // Log-normalise: find global max qty in view
  let maxQty = 0;
  for (const snap of visible) {
    for (const [, qty] of snap.levels) {
      if (qty > maxQty) maxQty = qty;
    }
  }
  if (maxQty === 0) return;
  const logMax = Math.log10(1 + maxQty);

  // ── Paint heatmap pixels ────────────────────────────────────────────────────
  const imageData = ctx.createImageData(W, H);
  const data8     = imageData.data;

  // Fill background with Uint32 for speed (equivalent to memset)
  const bg32  = (255 << 24) | (BG_B << 16) | (BG_G << 8) | BG_R; // little-endian RGBA
  const data32 = new Uint32Array(data8.buffer);
  data32.fill(bg32);

  const colW   = W / visible.length;

  visible.forEach((snap, ci) => {
    const xStart = Math.round(ci * colW);
    const xEnd   = Math.min(Math.round((ci + 1) * colW), W);
    if (xStart >= xEnd) return;

    for (const [binPrice, qty] of snap.levels) {
      if (qty <= 0) continue;
      const binIdx = Math.round((binPrice - priceMin) / binSize);
      if (binIdx < 0 || binIdx >= NUM_PRICE_BINS) continue;

      const yTop = Math.max(0, Math.round(H - (binIdx + 1) * pixPerBin));
      const yBot = Math.min(H, Math.round(H - binIdx * pixPerBin));
      if (yTop >= yBot) continue;

      const ratio  = Math.log10(1 + qty) / logMax;
      const lutIdx = Math.round(Math.max(0, Math.min(1, ratio)) * (LUT_SIZE - 1)) * 3;
      const r = COLOR_LUT[lutIdx];
      const g = COLOR_LUT[lutIdx + 1];
      const b = COLOR_LUT[lutIdx + 2];
      const px32 = (255 << 24) | (b << 16) | (g << 8) | r;

      for (let y = yTop; y < yBot; y++) {
        for (let x = xStart; x < xEnd; x++) {
          data32[y * W + x] = px32;
        }
      }
    }
  });

  ctx.putImageData(imageData, 0, 0);

  // ── Price history trace ─────────────────────────────────────────────────────
  ctx.strokeStyle = '#47556966';
  ctx.lineWidth   = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  visible.forEach((snap, ci) => {
    const x = (ci + 0.5) * colW;
    const y = H - ((snap.mid - priceMin) / priceRange) * H;
    ci === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // ── Current price dashed line ───────────────────────────────────────────────
  const midY = H - ((latestMid - priceMin) / priceRange) * H;
  ctx.strokeStyle = '#00D4FF';
  ctx.lineWidth   = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(62, midY);
  ctx.lineTo(W - 82, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Price label pill (right side) ──────────────────────────────────────────
  ctx.fillStyle = '#00D4FF';
  ctx.beginPath();
  const lx = W - 80, ly = midY - 10, lw = 76, lh = 20, lr = 4;
  ctx.roundRect(lx, ly, lw, lh, lr);
  ctx.fill();
  ctx.fillStyle = '#060E1A';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`$${Math.round(latestMid).toLocaleString()}`, lx + lw / 2, ly + 13);

  // ── Y-axis panel ───────────────────────────────────────────────────────────
  ctx.fillStyle = `rgba(${BG_R},${BG_G},${BG_B},0.88)`;
  ctx.fillRect(0, 0, 60, H);

  ctx.fillStyle = '#374151';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';

  const labelStep = Math.ceil(NUM_PRICE_BINS / 10);
  for (let i = 0; i <= NUM_PRICE_BINS; i += labelStep) {
    const price = priceMin + i * binSize;
    const y     = H - i * pixPerBin;
    if (y < 10 || y > H - 5) continue;
    const label = price >= 1000
      ? `${(price / 1000).toFixed(1)}K`
      : price.toFixed(0);
    ctx.fillText(`$${label}`, 57, y + 3);
    ctx.strokeStyle = '#1E293B55';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(W - 82, y);
    ctx.stroke();
  }

  // ── X-axis panel ───────────────────────────────────────────────────────────
  ctx.fillStyle = `rgba(${BG_R},${BG_G},${BG_B},0.88)`;
  ctx.fillRect(0, H - 18, W, 18);

  ctx.fillStyle = '#374151';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';

  const timeStep = Math.max(1, Math.floor(visible.length / 7));
  for (let ci = 0; ci < visible.length; ci += timeStep) {
    const x  = (ci + 0.5) * colW;
    const dt = new Date(visible[ci].ts);
    const label = dt.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    ctx.fillText(label, x, H - 5);
  }

  // ── Color scale legend ─────────────────────────────────────────────────────
  const barH = Math.min(180, H - 60);
  const barX = W - 16;
  const barY = Math.round((H - barH) / 2);
  const gd   = ctx.createImageData(10, barH);
  const gd32 = new Uint32Array(gd.data.buffer);
  for (let y = 0; y < barH; y++) {
    const ratio  = (barH - 1 - y) / (barH - 1);
    const lutIdx = Math.round(ratio * (LUT_SIZE - 1)) * 3;
    const r = COLOR_LUT[lutIdx];
    const g = COLOR_LUT[lutIdx + 1];
    const b = COLOR_LUT[lutIdx + 2];
    const px = (255 << 24) | (b << 16) | (g << 8) | r;
    for (let x = 0; x < 10; x++) gd32[y * 10 + x] = px;
  }
  ctx.putImageData(gd, barX, barY);

  ctx.fillStyle = '#374151';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Hi', barX + 5, barY - 3);
  ctx.fillText('Lo', barX + 5, barY + barH + 10);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LiquidityHeatmap() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const bookRef    = useRef<OrderBook>({
    bids: new Map(), asks: new Map(),
    lastUpdateId: 0, ready: false, buffer: [],
  });
  const snapsRef   = useRef<Snapshot[]>([]);
  const wsRef      = useRef<WebSocket | null>(null);
  const reconnRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attemptsRef = useRef(0);
  const statusRef  = useRef<Status>('connecting');

  const [status,  setStatus ] = useState<Status>('connecting');
  const [binSize, setBinSize] = useState(100);
  const [winMins, setWinMins] = useState(10);
  const [ticker,  setTicker ] = useState<TickerState>({
    bid: 0, ask: 0, mid: 0, spread: 0,
    largestBidQty: 0, largestBidPrice: 0,
    largestAskQty: 0, largestAskPrice: 0,
  });

  // Keep refs in sync so render loop always reads current values
  const binSizeRef = useRef(binSize);
  const winMinsRef = useRef(winMins);
  useEffect(() => { binSizeRef.current = binSize; }, [binSize]);
  useEffect(() => { winMinsRef.current = winMins; }, [winMins]);

  const setStatusBoth = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // ── WebSocket + order book management ────────────────────────────────────────
  const connect = useCallback(() => {
    wsRef.current?.close();

    const book  = bookRef.current;
    book.ready  = false;
    book.buffer = [];

    setStatusBoth('connecting');

    // Cycle through fallback URLs so each retry tries the next endpoint
    const wsUrl    = WS_URLS[attemptsRef.current % WS_URLS.length];
    const isUsHost = wsUrl.includes('binance.us');
    const ws       = new WebSocket(wsUrl);
    wsRef.current  = ws;

    // Abort silent TCP hangs (e.g. port blocked, no RST sent)
    const connectTimer = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) ws.close();
    }, WS_CONNECT_TIMEOUT_MS);

    ws.onopen = async () => {
      clearTimeout(connectTimer);
      setStatusBoth('syncing');
      const exchange = isUsHost ? 'us' : 'com';
      try {
        const res = await fetch(
          `/api/binance/depth?symbol=BTCUSDT&limit=1000&exchange=${exchange}`,
        );
        if (!res.ok) throw new Error(`Snapshot HTTP ${res.status}`);
        const snap = await res.json() as {
          lastUpdateId: number;
          bids: [string, string][];
          asks: [string, string][];
        };

        book.bids.clear();
        book.asks.clear();
        for (const [p, q] of snap.bids) {
          const qty = parseFloat(q);
          if (qty > 0) book.bids.set(parseFloat(p), qty);
        }
        for (const [p, q] of snap.asks) {
          const qty = parseFloat(q);
          if (qty > 0) book.asks.set(parseFloat(p), qty);
        }
        book.lastUpdateId = snap.lastUpdateId;

        for (const evt of book.buffer) {
          if (evt.u <= book.lastUpdateId) continue;
          applyDelta(book, evt);
        }
        book.buffer = [];
        book.ready  = true;
        attemptsRef.current = 0;
        setStatusBoth('live');
      } catch {
        ws.close();
      }
    };

    ws.onmessage = (e: MessageEvent) => {
      const evt = JSON.parse(e.data as string) as DepthEvent;
      if (!book.ready) { book.buffer.push(evt); return; }
      applyDelta(book, evt);
    };

    ws.onclose = () => {
      clearTimeout(connectTimer);
      wsRef.current = null;
      if (attemptsRef.current < WS_URLS.length * 3) {
        // short delay so the browser can release the old socket
        const delay = 1500;
        attemptsRef.current++;
        setStatusBoth('connecting');
        reconnRef.current = setTimeout(connect, delay);
      } else {
        setStatusBoth('error');
      }
    };

    ws.onerror = () => {
      clearTimeout(connectTimer);
      ws.close();
    };
  }, [setStatusBoth]);

  // ── Snapshot capture interval + WebSocket lifecycle ───────────────────────
  useEffect(() => {
    connect();

    const intervalId = setInterval(() => {
      const book = bookRef.current;
      if (!book.ready) return;

      let bestBid = 0, bestAsk = Infinity;
      for (const p of book.bids.keys()) { if (p > bestBid)  bestBid = p; }
      for (const p of book.asks.keys()) { if (p < bestAsk) bestAsk = p; }
      if (bestBid === 0 || bestAsk === Infinity) return;

      const mid = (bestBid + bestAsk) / 2;
      const bs  = binSizeRef.current;

      // Bin both sides together (liquidity density = bids + asks at each level)
      const levels = new Map<number, number>();
      const addSide = (map: Map<number, number>) => {
        for (const [price, qty] of map) {
          const bin = Math.floor(price / bs) * bs;
          levels.set(bin, (levels.get(bin) ?? 0) + qty);
        }
      };
      addSide(book.bids);
      addSide(book.asks);

      snapsRef.current.push({ ts: Date.now(), mid, levels });
      if (snapsRef.current.length > MAX_SNAPSHOTS) snapsRef.current.shift();

      // Update UI ticker cards
      const [lbp, lbq] = mapMax(book.bids);
      const [lap, laq] = mapMax(book.asks);
      setTicker({
        bid: bestBid, ask: bestAsk, mid, spread: bestAsk - bestBid,
        largestBidQty: lbq, largestBidPrice: lbp,
        largestAskQty: laq, largestAskPrice: lap,
      });
    }, SNAPSHOT_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(reconnRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // ── Canvas: responsive width via ResizeObserver ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = Math.round(entry.contentRect.width);
      }
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // ── Canvas: 60 fps animation loop ─────────────────────────────────────────
  useEffect(() => {
    let frameId: number;
    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        renderHeatmap(
          canvas,
          snapsRef.current,
          binSizeRef.current,
          winMinsRef.current * 60_000,
          statusRef.current,
        );
      }
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const statusColor =
    status === 'live'       ? '#35D07F'
    : status === 'error'    ? '#FF5C5C'
    : status === 'syncing'  ? '#3B82F6'
    : '#E6B450';

  const statusLabel =
    status === 'live'       ? 'LIVE'
    : status === 'syncing'  ? 'SYNCING'
    : status === 'error'    ? 'ERROR'
    : 'CONNECTING';

  return (
    <div className="space-y-4">
      {/* ── Controls bar ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {/* Symbol + status */}
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTCUSDT · Binance
          </span>
          <span className="flex items-center gap-1.5 text-xs font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${status === 'live' ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: statusColor }}
            />
            <span style={{ color: statusColor }}>{statusLabel}</span>
          </span>

          {/* Merge (bin) level */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>Merge:</span>
            {BIN_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  setBinSize(o.value);
                  snapsRef.current = []; // clear history — bin structure changed
                }}
                className="px-2 py-0.5 rounded text-[11px] font-mono border transition-all"
                style={{
                  backgroundColor: binSize === o.value ? 'var(--sct-border)' : 'transparent',
                  borderColor:     'var(--sct-border)',
                  color:           binSize === o.value ? 'var(--sct-text)' : 'var(--sct-muted)',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time window */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>Window:</span>
          {WINDOW_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setWinMins(o.value)}
              className="px-2 py-0.5 rounded text-[11px] font-mono border transition-all"
              style={{
                backgroundColor: winMins === o.value ? 'var(--sct-border)' : 'transparent',
                borderColor:     'var(--sct-border)',
                color:           winMins === o.value ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Canvas ────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: `rgb(${BG_R},${BG_G},${BG_B})`,
          borderColor: 'var(--sct-border)',
          height: CANVAS_H,
        }}
      >
        {status === 'error' ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <p className="text-sm font-mono" style={{ color: '#FF5C5C' }}>
              WebSocket connection failed after multiple attempts
            </p>
            <button
              onClick={() => { attemptsRef.current = 0; connect(); }}
              className="px-4 py-1.5 rounded text-xs font-mono border transition-colors"
              style={{ borderColor: '#FF5C5C50', color: '#FF5C5C' }}
            >
              Retry connection
            </button>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={1200}
            height={CANVAS_H}
            style={{ display: 'block', width: '100%', height: CANVAS_H }}
          />
        )}
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Mid Price',
            value: ticker.mid > 0 ? fmtUSD(ticker.mid) : '—',
            color: '#00D4FF',
          },
          {
            label: 'Best Bid',
            value: ticker.bid > 0 ? fmtUSD(ticker.bid) : '—',
            color: '#35D07F',
          },
          {
            label: 'Best Ask',
            value: ticker.ask > 0 ? fmtUSD(ticker.ask) : '—',
            color: '#FF5C5C',
          },
          {
            label: 'Spread',
            value: ticker.spread > 0 ? `$${ticker.spread.toFixed(2)}` : '—',
            sub:   ticker.spread > 0 && ticker.mid > 0
              ? `${((ticker.spread / ticker.mid) * 100).toFixed(4)}%`
              : '',
            color: '#94A3B8',
          },
          {
            label: '▲ Largest Ask Wall',
            value: ticker.largestAskQty > 0 ? fmtQty(ticker.largestAskQty) : '—',
            sub:   ticker.largestAskPrice > 0 ? `@ ${fmtUSD(ticker.largestAskPrice)}` : '',
            color: '#FF5C5C',
          },
          {
            label: '▼ Largest Bid Wall',
            value: ticker.largestBidQty > 0 ? fmtQty(ticker.largestBidQty) : '—',
            sub:   ticker.largestBidPrice > 0 ? `@ ${fmtUSD(ticker.largestBidPrice)}` : '',
            color: '#35D07F',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border p-3"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-[10px] font-mono uppercase mb-1.5 tracking-wide" style={{ color: 'var(--sct-muted)' }}>
              {card.label}
            </p>
            <p className="text-base font-mono font-bold leading-tight" style={{ color: card.color }}>
              {card.value}
            </p>
            {'sub' in card && card.sub && (
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                {card.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Methodology note ────────────────────────────────────────────── */}
      <p className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
        Live order book depth from Binance WebSocket — bids + asks binned at selected merge level.
        Color intensity = log-scaled total quantity. Price trace = mid-price history.
        Data is client-side only and resets on page load.
      </p>
    </div>
  );
}
