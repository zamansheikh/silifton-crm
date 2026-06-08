"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { useApp } from "./app";
import type { TimerState } from "@/lib/types";

interface TimerContextValue {
  timer: TimerState | null;
  /** Live elapsed milliseconds, ticking every second while running. */
  displayMs: number;
  loading: boolean;
  start: (body: { project: string; task?: string | null; note?: string; billable?: boolean }) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<number>; // returns minutes logged
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside <TimerProvider>");
  return ctx;
}

export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { bump } = useApp();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [displayMs, setDisplayMs] = useState(0);
  const [loading, setLoading] = useState(true);
  // base elapsed captured from the server + the wall-clock time we captured it.
  const sync = useRef<{ base: number; at: number }>({ base: 0, at: Date.now() });

  const apply = useCallback((t: TimerState | null) => {
    setTimer(t);
    if (t) {
      sync.current = { base: t.elapsedMs, at: Date.now() };
      setDisplayMs(t.elapsedMs);
    } else {
      setDisplayMs(0);
    }
  }, []);

  useEffect(() => {
    api.time.timer
      .get()
      .then(apply)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apply]);

  // Tick once a second while running.
  useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => {
      setDisplayMs(sync.current.base + (Date.now() - sync.current.at));
    }, 1000);
    return () => clearInterval(id);
  }, [timer?.running]);

  const start = useCallback(
    async (body: { project: string; task?: string | null; note?: string; billable?: boolean }) => {
      apply(await api.time.timer.start(body));
    },
    [apply],
  );
  const pause = useCallback(async () => {
    apply(await api.time.timer.pause());
  }, [apply]);
  const resume = useCallback(async () => {
    apply(await api.time.timer.resume());
  }, [apply]);
  const stop = useCallback(async (): Promise<number> => {
    const { mins } = await api.time.timer.stop();
    apply(null);
    bump(); // refresh time sheets / dashboard
    return mins;
  }, [apply, bump]);

  return (
    <TimerContext.Provider value={{ timer, displayMs, loading, start, pause, resume, stop }}>
      {children}
    </TimerContext.Provider>
  );
}
