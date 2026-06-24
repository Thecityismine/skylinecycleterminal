"use client";
import { useState, useCallback } from 'react';

export type ZoomDomain = { start: string; end: string };

export function useChartZoom() {
  const [selecting, setSelecting] = useState(false);
  const [anchor,    setAnchor]    = useState<string | null>(null);
  const [cursor,    setCursor]    = useState<string | null>(null);
  const [domain,    setDomain]    = useState<ZoomDomain | null>(null);

  const onMouseDown = useCallback((e: any) => {
    const label = e?.activeLabel as string | undefined;
    if (!label) return;
    setAnchor(label);
    setCursor(label);
    setSelecting(true);
  }, []);

  const onMouseMove = useCallback((e: any) => {
    if (!selecting) return;
    const label = e?.activeLabel as string | undefined;
    if (label) setCursor(label);
  }, [selecting]);

  const onMouseUp = useCallback(() => {
    if (!selecting || !anchor || !cursor || anchor === cursor) {
      setSelecting(false);
      setAnchor(null);
      setCursor(null);
      return;
    }
    const [start, end] = anchor < cursor ? [anchor, cursor] : [cursor, anchor];
    setDomain({ start, end });
    setSelecting(false);
    setAnchor(null);
    setCursor(null);
  }, [selecting, anchor, cursor]);

  const reset = useCallback(() => setDomain(null), []);

  const cancel = useCallback(() => {
    setSelecting(false);
    setAnchor(null);
    setCursor(null);
  }, []);

  const selectionArea =
    selecting && anchor && cursor && anchor !== cursor
      ? { x1: anchor < cursor ? anchor : cursor, x2: anchor < cursor ? cursor : anchor }
      : null;

  return {
    domain,
    isZoomed:    domain !== null,
    isSelecting: selecting,
    selectionArea,
    reset,
    cancel,
    chartHandlers: { onMouseDown, onMouseMove, onMouseUp },
  };
}
