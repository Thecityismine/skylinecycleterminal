"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Download, Share2, Copy, Check, Loader2 } from 'lucide-react';
import { ScoreShareCard, SCORE_CARD_CHART_RECT }  from '@/components/share/ScoreShareCard';
import type { ScoreSharePayload } from '@/components/share/ScoreShareCard';
import {
  exportShareCard,
  compositeWatermark,
  downloadPng,
  dataUrlToFile,
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
} from '@/lib/share/exportShareCard';
import { shareImageFile, copyImageToClipboard } from '@/lib/share/webShare';
import { processLogoForWatermark } from '@/lib/share/processLogo';

type Props = {
  payload:  ScoreSharePayload;
  onClose:  () => void;
};

type ExportState = 'idle' | 'exporting' | 'ready';

const PREVIEW_SCALE = 0.42;   // ≈ 504 × 283 preview on screen

export function SharePreviewModal({ payload, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state,    setState]    = useState<ExportState>('idle');
  const [dataUrl,  setDataUrl]  = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);
  const [hasShare, setHasShare] = useState(false);
  const [logoSrc,  setLogoSrc]  = useState<string | null>(null);

  // Detect Web Share API capability
  useEffect(() => {
    const testFile = new File([''], 'test.png', { type: 'image/png' });
    setHasShare(
      typeof navigator !== 'undefined' &&
      !!navigator.share &&
      !!navigator.canShare?.({ files: [testFile] }),
    );
  }, []);

  // Process the logo on mount — strips white bg, converts pixels to white
  useEffect(() => {
    processLogoForWatermark('/skyline-full.png')
      .then(setLogoSrc)
      .catch(() => setLogoSrc(''));
  }, []);

  // Auto-generate once logo processing is done
  useEffect(() => {
    if (logoSrc === null) return;  // still processing
    const timer = setTimeout(() => void generate(), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoSrc]);

  const generate = useCallback(async () => {
    if (!cardRef.current) return;
    setState('exporting');
    try {
      const raw = await exportShareCard(cardRef.current);
      const url = await compositeWatermark(raw, logoSrc ?? '', SCORE_CARD_CHART_RECT);
      setDataUrl(url);
      setState('ready');
    } catch (err) {
      console.error('Share card export failed', err);
      setState('idle');
    }
  }, [logoSrc]);

  const handleDownload = useCallback(() => {
    if (!dataUrl) return;
    const ts = new Date().toISOString().slice(0, 10);
    downloadPng(dataUrl, `skyline-cycle-score-${ts}.png`);
  }, [dataUrl]);

  const handleShare = useCallback(async () => {
    if (!dataUrl) return;
    const ts   = new Date().toISOString().slice(0, 10);
    const file = dataUrlToFile(dataUrl, `skyline-cycle-score-${ts}.png`);
    const ok   = await shareImageFile(file, 'Skyline Cycle Score');
    if (!ok) handleDownload();
  }, [dataUrl, handleDownload]);

  const handleCopy = useCallback(async () => {
    if (!dataUrl) return;
    const ok = await copyImageToClipboard(dataUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [dataUrl]);

  // Close on backdrop click
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="rounded-xl border shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#0D1117', borderColor: '#21262D', maxWidth: 600, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #21262D' }}>
          <p className="text-sm font-semibold" style={{ color: '#E6EDF3' }}>Share Chart Card</p>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors"
            style={{ color: '#8B949E' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview area */}
        <div className="relative p-4 flex items-center justify-center" style={{ backgroundColor: '#090D13' }}>
          {/* 1200×675 render target — fixed+opacity:0 so images actually load */}
          <div
            style={{
              position:      'fixed',
              top:           0,
              left:          0,
              width:         SHARE_CARD_WIDTH,
              height:        SHARE_CARD_HEIGHT,
              opacity:       0.001,
              pointerEvents: 'none',
              userSelect:    'none',
              zIndex:        9999,
            }}
          >
            <div ref={cardRef}>
              <ScoreShareCard payload={payload} />
            </div>
          </div>

          {/* Scaled preview — show the generated PNG or a spinner */}
          <div
            style={{
              width:           Math.round(SHARE_CARD_WIDTH  * PREVIEW_SCALE),
              height:          Math.round(SHARE_CARD_HEIGHT * PREVIEW_SCALE),
              borderRadius:    8,
              overflow:        'hidden',
              border:          '1px solid #21262D',
              position:        'relative',
            }}
          >
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="Share card preview"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width:           '100%',
                  height:          '100%',
                  backgroundColor: '#0D1117',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  flexDirection:   'column',
                  gap:             8,
                }}
              >
                <Loader2 size={20} style={{ color: '#484F58', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: 11, color: '#484F58' }}>Generating card…</p>
              </div>
            )}
          </div>
        </div>

        {/* Size note */}
        <p className="text-center text-[10px] pb-1" style={{ color: '#484F58' }}>
          {SHARE_CARD_WIDTH * 2} × {SHARE_CARD_HEIGHT * 2}px PNG · optimized for X / LinkedIn / Telegram
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 p-4" style={{ borderTop: '1px solid #21262D' }}>
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={state !== 'ready'}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: state === 'ready' ? '#35D07F22' : '#21262D',
              border:          `1px solid ${state === 'ready' ? '#35D07F' : '#30363D'}`,
              color:           state === 'ready' ? '#35D07F' : '#484F58',
              cursor:          state === 'ready' ? 'pointer' : 'not-allowed',
            }}
          >
            {state === 'exporting' ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Download size={14} />
            )}
            {state === 'exporting' ? 'Rendering…' : 'Download PNG'}
          </button>

          {/* Share (mobile) */}
          {hasShare && (
            <button
              onClick={handleShare}
              disabled={state !== 'ready'}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all"
              style={{
                backgroundColor: state === 'ready' ? '#3B82F622' : '#21262D',
                border:          `1px solid ${state === 'ready' ? '#3B82F6' : '#30363D'}`,
                color:           state === 'ready' ? '#3B82F6' : '#484F58',
                cursor:          state === 'ready' ? 'pointer' : 'not-allowed',
              }}
            >
              <Share2 size={14} />
              Share
            </button>
          )}

          {/* Copy to clipboard */}
          <button
            onClick={handleCopy}
            disabled={state !== 'ready'}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: copied ? '#E6B45022' : (state === 'ready' ? '#21262D' : '#161B22'),
              border:          `1px solid ${copied ? '#E6B450' : '#30363D'}`,
              color:           copied ? '#E6B450' : (state === 'ready' ? '#8B949E' : '#484F58'),
              cursor:          state === 'ready' ? 'pointer' : 'not-allowed',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
