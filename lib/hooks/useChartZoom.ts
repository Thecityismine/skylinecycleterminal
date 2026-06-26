"use client";
import { useState, useCallback } from 'react';

export type ZoomDomain<T = string> = { start: T; end: T };

export function useChartZoom<T extends string | number = string>() {
  const [selecting, setSelecting] = useState(false);
  const [anchor,    setAnchor]    = useState<T | null>(null);
  const [cursor,    setCursor]    = useState<T | null>(null);
  const [domain,    setDomain]    = useState<ZoomDomain<T> | null>(null);

  const onMouseDown = useCallback((e: any) => {
    const label = e?.activeLabel as T | undefined;
    if (label == null) return;
    setAnchor(label);
    setCursor(label);
    setSelecting(true);
  }, []);

  const onMouseMove = useCallback((e: any) => {
    if (!selecting) return;
    const label = e?.activeLabel as T | undefined;
    if (label != null) setCursor(label);
  }, [selecting]);

  const onMouseUp = useCallback(() => {
    if (!selecting || anchor == null || cursor == null || anchor === cursor) {
      setSelecting(false);
      setAnchor(null);
      setCursor(null);
      return;
    }
    const [start, end] = anchor < cursor ? [anchor, cursor] : [cursor, anchor];
    setDomain({ start, end } as ZoomDomain<T>);
    setSelecting(false);
    setAnchor(null);
    setCursor(null);
  }, [selecting, anchor, cursor]);

  const reset  = useCallback(() => setDomain(null), []);
  const jumpTo = useCallback((d: ZoomDomain<T>) => setDomain(d), []);

  const cancel = useCallback(() => {
    setSelecting(false);
    setAnchor(null);
    setCursor(null);
  }, []);

  const selectionArea =
    selecting && anchor != null && cursor != null && anchor !== cursor
      ? { x1: anchor < cursor ? anchor : cursor, x2: anchor < cursor ? cursor : anchor } as { x1: T; x2: T }
      : null;

  return {
    domain,
    isZoomed:    domain !== null,
    isSelecting: selecting,
    selectionArea,
    reset,
    jumpTo,
    cancel,
    chartHandlers: { onMouseDown, onMouseMove, onMouseUp },
  };
}
