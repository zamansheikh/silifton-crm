"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, I } from "./primitives";

// The app stores dates as display strings like "Jun 16" (year is 2026).
// This picker reads/writes that format but lets users pick from a calendar.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const YEAR = 2026;
const TODAY = { m: 4, d: 26 }; // May 26 2026
const PANEL_W = 256;
const PANEL_H = 320;

function parse(v: string | undefined): { m: number; d: number } | null {
  if (!v) return null;
  const [mon, d] = v.trim().split(/\s+/);
  const m = MONTHS.indexOf(mon);
  if (m < 0 || !d) return null;
  return { m, d: parseInt(d, 10) };
}
const fmt = (m: number, d: number) => `${MONTHS[m]} ${String(d).padStart(2, "0")}`;

export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const parsed = parse(value);
  const [viewM, setViewM] = useState(parsed ? parsed.m : TODAY.m);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed) setViewM(parsed.m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    let left = Math.min(r.left, window.innerWidth - PANEL_W - 8);
    left = Math.max(8, left);
    let top = r.bottom + 6;
    if (top + PANEL_H > window.innerHeight - 8) top = Math.max(8, r.top - PANEL_H - 6);
    setPos({ top, left });
  };

  const toggle = () => {
    if (!open) {
      setViewM(parsed ? parsed.m : TODAY.m);
      place();
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const daysInMonth = new Date(YEAR, viewM + 1, 0).getDate();
  const firstDow = (new Date(YEAR, viewM, 1).getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const pick = (d: number) => {
    onChange(fmt(viewM, d));
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="input"
        onClick={toggle}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ color: value ? "var(--text)" : "var(--text-dim)" }}>{value || placeholder}</span>
        <Icon d={I.cal} size={14} color="var(--accent-soft)" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="surface-frosted fade-up"
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 200, width: PANEL_W, padding: 12, background: "var(--bg-elevate)", boxShadow: "0 16px 40px rgba(0,0,0,.45)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button type="button" className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }} onClick={() => setViewM((m) => Math.max(0, m - 1))} disabled={viewM === 0}>
                <Icon d={I.chevL} size={13} />
              </button>
              <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>{MONTHS[viewM]} {YEAR}</span>
              <button type="button" className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }} onClick={() => setViewM((m) => Math.min(11, m + 1))} disabled={viewM === 11}>
                <Icon d={I.chevR} size={13} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {WEEKDAYS.map((w) => (
                <span key={w} style={{ textAlign: "center", fontSize: 9.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{w}</span>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {cells.map((d, i) => {
                if (d === null) return <span key={i} />;
                const isSel = parsed?.m === viewM && parsed?.d === d;
                const isToday = viewM === TODAY.m && d === TODAY.d;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(d)}
                    style={{
                      height: 28,
                      borderRadius: 7,
                      border: isToday && !isSel ? "1px solid var(--border-hi)" : "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "'Geist Mono', monospace",
                      color: isSel ? "#fff" : "var(--text)",
                      background: isSel ? "var(--accent-grad)" : "transparent",
                      fontWeight: isSel ? 700 : 500,
                    }}
                    onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--surface-hi)"; }}
                    onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => pick(TODAY.d)}>Today</button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
