"use client";

import { Icon, I } from "./primitives";

export function ComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, minHeight: "60vh" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, margin: "0 auto 18px", background: "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px color-mix(in oklab, var(--accent) 35%, transparent)" }}>
          <Icon d={I.sparkles} size={32} color="#fff" />
        </div>
        <div className="italic-serif" style={{ fontSize: 32, color: "var(--text)", letterSpacing: -0.5 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 8 }}>{subtitle}</div>}
        <div style={{ marginTop: 22, fontSize: 12, color: "var(--text-dim)" }}>Plumbing in. Use any other screen from the sidebar for now.</div>
      </div>
    </div>
  );
}
