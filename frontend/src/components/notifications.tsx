"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I, Avatar, Eyebrow } from "./primitives";
import { useApp } from "@/providers/app";
import { api } from "@/lib/api";
import type { ActivityItem } from "@/lib/types";

export function NotificationsBell() {
  const router = useRouter();
  const { teamById, projectById, version } = useApp();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.activity().then(setItems).catch(() => {});
  }, [version]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    setSeen(true);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn-icon" style={{ position: "relative" }} title="Notifications" onClick={toggle}>
        <Icon d={I.bell} size={14} color="var(--text-sub)" />
        {!seen && items.length > 0 && (
          <span style={{ position: "absolute", top: 5, right: 6, width: 8, height: 8, borderRadius: 99, background: "var(--accent-2)", boxShadow: "0 0 8px var(--accent-2), 0 0 0 2px var(--topbar-bg)" }} />
        )}
      </button>

      {open && (
        <div className="surface-frosted fade-up notif-panel" style={{ position: "absolute", top: 40, right: 0, width: 340, zIndex: 60, overflow: "hidden", background: "var(--bg-elevate)", boxShadow: "0 20px 50px rgba(0,0,0,.45)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>Notifications</span>
            <span style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{items.length}</span>
          </div>
          <div style={{ maxHeight: 360, overflow: "auto" }}>
            {items.map((a, i) => {
              const m = teamById[a.who];
              const p = projectById[a.project];
              return (
                <button
                  key={a.id}
                  onClick={() => { setOpen(false); if (p) router.push(`/projects/${p.id}`); }}
                  style={{ width: "100%", display: "flex", gap: 11, padding: "11px 16px", borderTop: i ? "1px solid var(--border)" : "none", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Avatar name={m?.name ?? "?"} bg={m?.bg} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-sub)", lineHeight: 1.5 }}>
                      <span style={{ color: "var(--text)", fontWeight: 500 }}>{m?.name.split(" ")[0] ?? "Someone"}</span> {a.action} <span style={{ color: "var(--accent-soft)" }}>{a.target}</span>
                    </div>
                    <div style={{ marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                      <Eyebrow size={10}>{a.time}</Eyebrow>
                      <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)" }}>{a.kind}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {items.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 12.5 }}>You&apos;re all caught up.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
