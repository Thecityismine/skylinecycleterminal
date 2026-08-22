"use client";

import { useState, useEffect } from 'react';

export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** HTTP status of the failed response, so callers can tell 404 from an outage. */
  status: number | null;
};

type Result = { data: unknown; error: string | null; status: number | null };

// Shared per-URL cache, so one URL is fetched once per page rather than once per
// component that asks for it.
//
// Every component called fetch() on its own. A page with three components
// reading /api/market fired three requests that landed milliseconds apart and
// resolved to different ticks: the top bar, the signal banner and the stat card
// showed BTC prices tens of dollars apart, all labelled live. Sharing the
// in-flight promise makes every reader on a page see one answer.
//
// The TTL is deliberately short. This is request coalescing, not a data cache —
// a remount after the window should still get fresh numbers, and freshness is
// the whole point of the endpoints this hook is pointed at.
const TTL_MS = 30_000;

const inflight = new Map<string, Promise<Result>>();
const settled  = new Map<string, { at: number; result: Result }>();

function load(url: string): Promise<Result> {
  const hit = settled.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.result);

  const pending = inflight.get(url);
  if (pending) return pending;

  const p = (async (): Promise<Result> => {
    let status: number | null = null;
    try {
      const r = await fetch(url);
      status = r.status;
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try { const b = await r.json(); if (b?.error) msg = b.error; } catch {}
        return { data: null, error: msg, status };
      }
      return { data: await r.json(), error: null, status };
    } catch (e) {
      return { data: null, error: (e as Error).message, status };
    }
  })();

  inflight.set(url, p);

  return p.then((result) => {
    inflight.delete(url);
    // Failures are not cached: a transient outage should not be pinned to every
    // component that mounts in the next thirty seconds.
    if (result.error == null) settled.set(url, { at: Date.now(), result });
    return result;
  });
}

export function useApiData<T>(url: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
    status: null,
  });

  useEffect(() => {
    let cancelled = false;

    load(url).then((result) => {
      if (cancelled) return;
      setState({
        data: result.data as T | null,
        loading: false,
        error: result.error,
        status: result.status,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
