"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I, Avatar } from "./primitives";
import { useApp } from "@/providers/app";
import { onOpenSearch } from "@/lib/search-bus";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";

type Result =
  | { kind: "project"; id: string; title: string; sub: string; code: string; accent: [string, string] }
  | { kind: "task"; id: string; title: string; sub: string; code?: string }
  | { kind: "client"; id: string; title: string; sub: string; color: string; logo: string }
  | { kind: "member"; id: string; title: string; sub: string; bg: string }
  | { kind: "nav"; id: string; title: string; sub: string; href: string };

const NAV: { id: string; title: string; href: string }[] = [
  { id: "dashboard", title: "Dashboard", href: "/dashboard" },
  { id: "projects", title: "Projects", href: "/projects" },
  { id: "tasks", title: "Tasks", href: "/tasks" },
  { id: "time", title: "Time tracking", href: "/time" },
  { id: "clients", title: "Clients", href: "/clients" },
  { id: "team", title: "Team", href: "/team" },
  { id: "invoices", title: "Invoices", href: "/invoices" },
  { id: "expenses", title: "Expenses", href: "/expenses" },
  { id: "accounting", title: "Accounting", href: "/accounting" },
  { id: "assets", title: "Fixed Assets", href: "/assets" },
  { id: "reports", title: "Reports", href: "/reports" },
  { id: "audit", title: "Audit log", href: "/audit" },
  { id: "settings", title: "Settings", href: "/settings" },
];

export function CommandPalette() {
  const router = useRouter();
  const { projects, clients, team, clientById, openTask } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Only dismiss when the press *starts* on the backdrop, so a drag-select that
  // begins in the search box and releases on the scrim doesn't close the palette.
  const downOnBackdrop = useRef(false);

  // Open via ⌘K / Ctrl+K and via the search bus (sidebar / topbar buttons).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    const off = onOpenSearch(() => setOpen(true));
    return () => {
      window.removeEventListener("keydown", onKey);
      off();
    };
  }, []);

  // Load tasks lazily the first time the palette opens.
  useEffect(() => {
    if (open && tasks.length === 0) api.tasks.list().then(setTasks).catch(() => {});
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    if (!open) { setQ(""); setActive(0); }
  }, [open, tasks.length]);

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    const out: Result[] = [];
    if (!term) {
      NAV.slice(0, 6).forEach((n) => out.push({ kind: "nav", id: n.id, title: n.title, sub: "Go to", href: n.href }));
      return out;
    }
    const has = (s: string) => s.toLowerCase().includes(term);
    projects.filter((p) => has(p.name) || has(p.code) || p.tags.some(has)).slice(0, 5).forEach((p) =>
      out.push({ kind: "project", id: p.id, title: p.name, sub: `${clientById[p.client]?.name ?? ""} · ${p.pct}%`, code: p.code, accent: p.accent }),
    );
    tasks.filter((t) => has(t.title) || has(t.id) || t.tags.some(has)).slice(0, 6).forEach((t) =>
      out.push({ kind: "task", id: t.id, title: t.title, sub: `${t.id} · ${t.status}` }),
    );
    clients.filter((c) => has(c.name) || has(c.industry)).slice(0, 4).forEach((c) =>
      out.push({ kind: "client", id: c.id, title: c.name, sub: c.industry, color: c.color, logo: c.logo }),
    );
    team.filter((m) => has(m.name) || has(m.title) || has(m.role)).slice(0, 4).forEach((m) =>
      out.push({ kind: "member", id: m.id, title: m.name, sub: m.title, bg: m.bg }),
    );
    NAV.filter((n) => has(n.title)).slice(0, 3).forEach((n) =>
      out.push({ kind: "nav", id: n.id, title: n.title, sub: "Go to", href: n.href }),
    );
    return out;
  }, [q, projects, tasks, clients, team, clientById]);

  const go = (r: Result) => {
    setOpen(false);
    if (r.kind === "project") router.push(`/projects/${r.id}`);
    else if (r.kind === "task") openTask(r.id);
    else if (r.kind === "client") router.push("/clients");
    else if (r.kind === "member") router.push("/team");
    else router.push(r.href);
  };

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && downOnBackdrop.current) setOpen(false); downOnBackdrop.current = false; }}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--scrim)", backdropFilter: "blur(4px)", animation: "scrim-in .15s ease-out", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}
    >
      <div onClick={(e) => e.stopPropagation()} className="surface-frosted fade-up" style={{ width: 560, maxWidth: "92vw", zIndex: 81, overflow: "hidden", background: "var(--bg-elevate)", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <Icon d={I.search} size={16} color="var(--text-dim)" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search projects, tasks, clients, people…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }}
          />
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>ESC</span>
        </div>
        <div style={{ maxHeight: 380, overflow: "auto", padding: 8 }}>
          {results.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No matches.</div>}
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => go(r)}
              onMouseEnter={() => setActive(i)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 9, border: "none", cursor: "pointer", textAlign: "left", background: i === active ? "var(--surface-hi)" : "transparent" }}
            >
              <ResultIcon r={r} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>
              </div>
              <span style={{ fontSize: 10, color: "var(--text-soft)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase" }}>{r.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultIcon({ r }: { r: Result }) {
  if (r.kind === "project")
    return <span style={{ width: 26, height: 26, borderRadius: 6, background: `linear-gradient(135deg, ${r.accent[0]}, ${r.accent[1]})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto" }}>{r.code}</span>;
  if (r.kind === "client")
    return <span style={{ width: 26, height: 26, borderRadius: 6, background: `color-mix(in oklab, ${r.color} 22%, var(--surface-hi))`, color: r.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto", border: `1px solid color-mix(in oklab, ${r.color} 30%, transparent)` }}>{r.logo}</span>;
  if (r.kind === "member") return <Avatar name={r.title} bg={r.bg} size={26} />;
  const icon = r.kind === "task" ? I.tasks : I.arrow;
  return <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}><Icon d={icon} size={13} color="var(--text-sub)" /></span>;
}
