"use client";

import { useEffect, useState } from "react";
import { Icon, I, Avatar, Eyebrow, SectionHeader } from "@/components/primitives";
import { useApp } from "@/providers/app";
import { api } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import type { AuditEntry } from "@/lib/types";

const ENTITY_COLOR: Record<string, string> = {
  invoice: "var(--success)",
  expense: "var(--danger)",
  accounting: "var(--accent)",
  project: "var(--info)",
  task: "var(--accent-2)",
  member: "var(--warning)",
  client: "var(--accent-soft)",
  auth: "var(--text-dim)",
};
const METHOD_COLOR: Record<string, string> = {
  POST: "var(--success)",
  PATCH: "var(--warning)",
  PUT: "var(--warning)",
  DELETE: "var(--danger)",
};

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const ENTITIES = ["all", "invoice", "expense", "accounting", "project", "task", "member", "client", "auth"];

export default function AuditPage() {
  const { teamById, role } = useApp();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [entity, setEntity] = useState("all");
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    api
      .audit({ entity: entity === "all" ? undefined : entity, limit: 300 })
      .then(setItems)
      .catch(() => setDenied(true));
  }, [entity]);

  const canView = role !== "dev";

  if (!canView || denied) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
          <Icon d={I.lock} size={28} color="var(--text-dim)" />
          <div style={{ marginTop: 10, fontSize: 14 }}>The audit log is restricted to managers and admins.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>System</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Audit log
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· append-only · {items.length} events</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" value={entity} onChange={(e) => setEntity(e.target.value)} style={{ width: "auto", fontSize: 12, textTransform: "capitalize" }}>
            {ENTITIES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <button className="btn" onClick={() => exportCsv("audit-log.csv", items.map((a) => ({ at: a.at, actor: a.actorName, action: a.action, entity: a.entity, entityId: a.entityId ?? "", method: a.method, status: a.status, path: a.path })))}><Icon d={I.download} size={12} /> Export</button>
        </div>
      </div>

      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          <SectionHeader title="Activity trail" subtitle="Every create / update / delete, with actor and timestamp — immutable" />
        </div>
        <div className="rt-head" style={{ display: "grid", gridTemplateColumns: "180px 1fr 150px 90px 80px", gap: 12, padding: "8px 18px", borderBottom: "1px solid var(--border)" }}>
          {["Actor", "Action", "Entity", "When", "Method"].map((h) => <Eyebrow key={h} size={10}>{h}</Eyebrow>)}
        </div>
        {items.map((a, i) => {
          const m = teamById[a.actor];
          const ec = ENTITY_COLOR[a.entity] ?? "var(--text-dim)";
          return (
            <div key={a.id} className="rt-row audit-row" style={{ display: "grid", gridTemplateColumns: "180px 1fr 150px 90px 80px", gap: 12, padding: "10px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
              <div data-label="Actor" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <Avatar name={a.actorName} bg={m?.bg} size={24} />
                <span style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.actorName}</span>
              </div>
              <span className="mono" data-label="Action" style={{ fontSize: 12, color: "var(--text-sub)" }}>{a.action}{a.entityId ? <span style={{ color: "var(--accent-soft)" }}> · {a.entityId}</span> : null}</span>
              <span data-label="Entity" style={{ fontSize: 10.5, color: ec, fontFamily: "'Geist Mono', monospace", padding: "2px 8px", borderRadius: 99, background: `color-mix(in oklab, ${ec} 14%, transparent)`, justifySelf: "start", textTransform: "uppercase" }}>{a.entity}</span>
              <span data-label="When" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{ago(a.at)}</span>
              <span data-label="Method" style={{ fontSize: 10, color: METHOD_COLOR[a.method] ?? "var(--text-dim)", fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>{a.method}</span>
            </div>
          );
        })}
        {items.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No events recorded.</div>}
      </div>
    </div>
  );
}
