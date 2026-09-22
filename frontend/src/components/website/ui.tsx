"use client";

import type { CSSProperties, ReactNode } from "react";
import { Eyebrow, Icon, I } from "@/components/primitives";
import { Sparkline } from "./charts";

// Absolute URL of the public site, for "view on site" links.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://silifton.com").replace(/\/$/, "");

export const pageStyle: CSSProperties = { flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 };
export const titleStyle: CSSProperties = { fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" };
export const metaStyle: CSSProperties = { marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 };
export const labelStyle: CSSProperties = { fontSize: 11, color: "var(--text-sub)", fontWeight: 600, display: "block", marginBottom: 6 };

export function PageHeader({ title, meta, actions }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <Eyebrow>Website</Eyebrow>
        <div style={titleStyle}>
          {title}
          {meta && <span className="italic-serif" style={metaStyle}>· {meta}</span>}
        </div>
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: Array<[T, string]> }) {
  return (
    <div style={{ display: "inline-flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 3, flexWrap: "wrap", gap: 2 }}>
      {tabs.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{ padding: "6px 13px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", color: value === v ? "#fff" : "var(--text-sub)", background: value === v ? "var(--accent-grad)" : "transparent", whiteSpace: "nowrap" }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={value}
      onClick={() => onChange(!value)}
      style={{ width: 40, height: 22, borderRadius: 99, border: "none", cursor: disabled ? "default" : "pointer", padding: 2, background: value ? "var(--accent-grad)" : "var(--surface-hi)", transition: "all .15s", display: "flex", justifyContent: value ? "flex-end" : "flex-start", opacity: disabled ? 0.6 : 1 }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 99, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
    </button>
  );
}

export function Banner({ tone = "error", children, onClose }: { tone?: "error" | "success"; children: ReactNode; onClose?: () => void }) {
  const color = tone === "error" ? "var(--danger)" : "var(--success)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13, color, background: `color-mix(in oklab, ${color} 10%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)` }}>
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 24, height: 24, color }}>
          <Icon d={I.x} size={12} />
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>{children}</div>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ padding: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-dim)", fontSize: 13 }}>
      <Icon d={I.refresh} size={16} color="var(--accent-soft)" style={{ animation: "spin .8s linear infinite" }} />
      {label}
    </div>
  );
}

export function TableHead({ cols, template }: { cols: string[]; template: string }) {
  return (
    <div className="rt-head" style={{ display: "grid", gridTemplateColumns: template, gap: 12, padding: "8px 18px", borderBottom: "1px solid var(--border)" }}>
      {cols.map((h) => <Eyebrow key={h} size={10}>{h}</Eyebrow>)}
    </div>
  );
}

export const rowStyle = (template: string, first: boolean): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: template,
  gap: 12,
  padding: "11px 18px",
  borderTop: first ? "none" : "1px solid var(--border)",
  alignItems: "center",
});

export function Chip({ label, color = "var(--text-dim)" }: { label: string; color?: string }) {
  return (
    <span style={{ fontSize: 10.5, color, fontFamily: "'Geist Mono', monospace", padding: "2px 8px", borderRadius: 99, background: `color-mix(in oklab, ${color} 14%, transparent)`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

export const STATUS_COLOR: Record<string, string> = {
  New: "var(--accent)",
  "In review": "var(--info)",
  Replied: "var(--text-sub)",
  Won: "var(--success)",
  Closed: "var(--text-dim)",
  Published: "var(--success)",
  Draft: "var(--warning)",
  Open: "var(--success)",
  Live: "var(--success)",
  "In progress": "var(--info)",
  "Tech screen": "var(--info)",
  "Portfolio review": "var(--warning)",
  "Hiring manager": "var(--info)",
  Onsite: "var(--accent)",
  Offer: "var(--success)",
  Hired: "var(--success)",
  Rejected: "var(--danger)",
  Critical: "var(--danger)",
  High: "var(--warning)",
  Medium: "var(--accent)",
  Low: "var(--text-dim)",
};

export function KpiCard({ label, value, sub, color, icon, spark }: { label: string; value: ReactNode; sub?: ReactNode; color: string; icon?: ReactNode; spark?: number[] }) {
  return (
    <div className="surface" style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${color}, transparent 65%)`, opacity: 0.2, filter: "blur(15px)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        {icon && <span style={{ width: 22, height: 22, borderRadius: 5, background: `color-mix(in oklab, ${color} 22%, transparent)`, color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>}
        <Eyebrow>{label}</Eyebrow>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 8, position: "relative" }}>
        <span style={{ fontSize: 26, color: "var(--text)", fontWeight: 700, letterSpacing: -0.6, fontFamily: "'Inter Tight', sans-serif" }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{sub}</span>}
      </div>
      {spark && spark.length > 1 && (
        <div style={{ marginTop: 8, position: "relative" }}>
          <Sparkline values={spark} color={color} width={240} height={32} />
        </div>
      )}
    </div>
  );
}
