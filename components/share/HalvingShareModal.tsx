"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Download, Share2, Copy, Check, Loader2 } from 'lucide-react';
import { HalvingShareCard } from '@/components/share/HalvingShareCard';
import type { HalvingSharePayload } from '@/components/share/HalvingShareCard';
import {
  exportShareCard,
  downloadPng,
  dataUrlToFile,
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
} from '@/lib/share/exportShareCard';
import { shareImageFile, copyImageToClipboard } from '@/lib/share/webShare';
import { processLogoForWatermark } from '@/lib/share/processLogo';

type Props = {
  payload:  HalvingSharePayload;
  onClose:  () => void;
};

type ExportState = 'idle' | 'exporting' | 'ready';

const PREVIEW_SCALE = 0.42;

export function HalvingShareModal({ payload, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state,    setState]    = useState<ExportState>('idle');
  const [dataUrl,  setDataUrl]  = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);
  const [hasShare, setHasShare] = useState(false);
  const [logoSrc,  setLogoSrc]  = useState<string | null>(null);

  useEffect(() => {
    const testFile = new File([''], 'test.png', { type: 'image/png' });
    setHasShare(
      typeof navigator !== 'undefined' &&
      !!navigator.share &&
      !!navigator.canShare?.({ files: [testFile] }),
    );
  }, []);

  useEffect(() => {
    processLogoForWatermark('/skyline-full.png')
      .then(setLogoSrc)
      .catch(() => setLogoSrc(''));
  }, []);

  useEffect(() => {
    if (logoSrc === null) return;
    const timer = setTimeout(() => void generate(), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoSrc]);

  const generate = useCallback(async () => {
    if (!cardRef.current) return;
    setState('exporting');
    try {
      const url = await exportShareCard(cardRef.current);
      setDataUrl(url);
      setState('ready');
    } catch {
      setState('idle');
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!dataUrl) return;
    downloadPng(dataUrl, `skyline-halving-${payload.rangeLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`);
  }, [dataUrl, payload.rangeLabel]);

  const handleShare = useCallback(async () => {
    if (!dataUrl) return;
    const file = dataUrlToFile(dataUrl, 'skyline-halving-cycles.png');
    const ok = await shareImageFile(file, 'Skyline Cycle Terminal — Halving Cycles');
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

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
              <HalvingShareCard payload={{ ...payload, logoSrc: logoSrc ?? undefined }} />
            </div>
          </div>

          {/* Scaled preview */}
          <div
            style={{
              width:        Math.round(SHARE_CARD_WIDTH  * PREVIEW_SCALE),
              height:       Math.round(SHARE_CARD_HEIGHT * PREVIEW_SCALE),
              borderRadius: 8,
              overflow:     'hidden',
              border:       '1px solid #21262D',
              position:     'relative',
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
                }}
              >
                <Loader2
                  size={24}
                  style={{ color: '#8B949E', animation: 'spin 1s linear infinite' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid #21262D' }}>
          <button
            onClick={() => void generate()}
            disabled={state === 'exporting'}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-all"
            style={{
              borderColor:     '#21262D',
              color:           '#8B949E',
              backgroundColor: 'transparent',
              opacity:         state === 'exporting' ? 0.5 : 1,
              cursor:          state === 'exporting' ? 'not-allowed' : 'pointer',
            }}
          >
            <Loader2 size={11} style={state === 'exporting' ? { animation: 'spin 1s linear infinite' } : {}} />
            Regenerate
          </button>

          <div className="flex-1" />

          {hasShare && (
            <button
              onClick={() => void handleShare()}
              disabled={!dataUrl}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-all"
              style={{
                borderColor:     '#21262D',
                color:           '#8B949E',
                backgroundColor: 'transparent',
                opacity:         !dataUrl ? 0.4 : 1,
                cursor:          !dataUrl ? 'not-allowed' : 'pointer',
              }}
            >
              <Share2 size={11} />
              Share
            </button>
          )}

          <button
            onClick={() => void handleCopy()}
            disabled={!dataUrl}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-all"
            style={{
              borderColor:     '#21262D',
              color:           copied ? '#35D07F' : '#8B949E',
              backgroundColor: 'transparent',
              opacity:         !dataUrl ? 0.4 : 1,
              cursor:          !dataUrl ? 'not-allowed' : 'pointer',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: dataUrl ? '#F7931A' : '#21262D',
              color:           dataUrl ? '#000' : '#6B7280',
              opacity:         !dataUrl ? 0.5 : 1,
              cursor:          !dataUrl ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={11} />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
