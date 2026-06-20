"use client";

import { useState, useEffect } from 'react';

export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useApiData<T>(url: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          let msg = `HTTP ${r.status}`;
          try { const b = await r.json(); if (b?.error) msg = b.error; } catch {}
          throw new Error(msg);
        }
        return r.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: e.message });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
