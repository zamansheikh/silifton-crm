"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Icon,
  I,
  Eyebrow,
  ProgressBar,
  SectionHeader,
  StatusPill,
  STATUS_META,
  fmtHM,
} from "@/components/primitives";
import { useApp } from "@/providers/app";
import { api } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import { money } from "@/lib/format";
import type { Task, TimeEntry, Invoice } from "@/lib/types";

// Consolidate mixed-currency figures to the BDT functional currency.
const toBDT = (amount: number, currency: string) => (currency === "USD" ? amount * 110 : amount);

const STATUS_ORDER = ["backlog", "todo", "doing", "review", "done"] as const;

export default function ReportsPage() {
  const { projects, clients, version } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [time, setTime] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api.tasks.list().then(setTasks).catch(() => {});
    api.time.list().then(setTime).catch(() => {});
    api.invoices.list().then(setInvoices).catch(() => {});
  }, [version]);

  const stats = useMemo(() => {
    const totalMins = time.reduce((a, e) => a + e.mins, 0);
    const billableMins = time.filter((e) => e.billable).reduce((a, e) => a + e.mins, 0);
    const revenue = invoices.reduce((a, i) => a + toBDT(i.amount, i.currency), 0);
    const collected = invoices.filter((i) => i.status === "Paid").reduce((a, i) => a + toBDT(i.amount, i.currency), 0);

    const minsByProject: Record<string, number> = {};
    time.forEach((e) => (minsByProject[e.project] = (minsByProject[e.project] ?? 0) + e.mins));

    const statusCounts = STATUS_ORDER.map((s) => ({ s, n: tasks.filter((t) => t.status === s).length }));
    const maxStatus = Math.max(1, ...statusCounts.map((x) => x.n));

    const avgHealth = projects.length ? Math.round(projects.reduce((a, p) => a + p.health, 0) / projects.length) : 0;

    return { totalMins, billableMins, revenue, collected, minsByProject, statusCounts, maxStatus, avgHealth };
  }, [tasks, time, invoices, projects]);

  const topClients = [...clients].filter((c) => c.billed > 0).sort((a, b) => toBDT(b.billed, b.currency) - toBDT(a.billed, a.currency)).slice(0, 6);
  const maxBilled = topClients[0] ? toBDT(topClients[0].billed, topClients[0].currency) : 1;
  const projByHours = [...projects].sort((a, b) => (stats.minsByProject[b.id] ?? 0) - (stats.minsByProject[a.id] ?? 0)).slice(0, 7);
  const maxProjMins = Math.max(1, ...projByHours.map((p) => stats.minsByProject[p.id] ?? 0));
  const billablePct = stats.totalMins ? Math.round((stats.billableMins / stats.totalMins) * 100) : 0;

  const kpis = [
    { label: "Revenue", value: money(stats.revenue, "BDT"), sub: `${money(stats.collected, "BDT")} collected`, color: "var(--accent-2)", icon: <Icon d={I.dollar} size={12} /> },
    { label: "Hours logged", value: fmtHM(stats.totalMins), sub: `${billablePct}% billable`, color: "var(--info)", icon: <Icon d={I.time} size={12} /> },
    { label: "Active projects", value: String(projects.length), sub: `${tasks.length} tasks`, color: "var(--accent)", icon: <Icon d={I.projects} size={12} /> },
    { label: "Avg health", value: `${stats.avgHealth}`, sub: "across projects", color: stats.avgHealth > 70 ? "var(--success)" : "var(--warning)", icon: <Icon d={I.trend} size={12} /> },
  ];

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Operate</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Reports
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· studio analytics</span>
          </div>
        </div>
        <button className="btn" onClick={() => exportCsv("project-report.csv", projects.map((p) => ({ project: p.name, client: p.client, status: p.status.label, progress: `${p.pct}%`, hoursLogged: ((stats.minsByProject[p.id] ?? 0) / 60).toFixed(1), budget: p.budget, health: p.health })))}>
          <Icon d={I.download} size={12} /> Export report
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {kpis.map((s) => (
          <div key={s.label} className="surface" style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${s.color}, transparent 65%)`, opacity: 0.2, filter: "blur(15px)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: `color-mix(in oklab, ${s.color} 22%, transparent)`, color: s.color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</span>
              <Eyebrow>{s.label}</Eyebrow>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 8, position: "relative" }}>
              <span style={{ fontSize: 26, color: "var(--text)", fontWeight: 700, letterSpacing: -0.6, fontFamily: "'Inter Tight', sans-serif" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Revenue by client */}
        <div className="surface" style={{ padding: "16px 18px" }}>
          <SectionHeader title="Revenue by client" subtitle="Billed to date" />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            {topClients.map((c) => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 64px", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                <div style={{ position: "relative", height: 16 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)" }} />
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(toBDT(c.billed, c.currency) / maxBilled) * 100}%`, borderRadius: 4, background: `linear-gradient(90deg, ${c.color}, color-mix(in oklab, ${c.color} 60%, white))`, boxShadow: `0 0 8px color-mix(in oklab, ${c.color} 40%, transparent)` }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "'Geist Mono', monospace", fontWeight: 600, textAlign: "right" }}>{money(toBDT(c.billed, c.currency), "BDT", false)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hours by project */}
        <div className="surface" style={{ padding: "16px 18px" }}>
          <SectionHeader title="Hours by project" subtitle="Logged time" />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            {projByHours.map((p) => {
              const mins = stats.minsByProject[p.id] ?? 0;
              return (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 56px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name.split("·")[0].trim()}</span>
                  <div style={{ position: "relative", height: 16 }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)" }} />
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(mins / maxProjMins) * 100}%`, borderRadius: 4, background: `linear-gradient(90deg, ${p.accent[0]}, ${p.accent[1]})`, boxShadow: `0 0 8px color-mix(in oklab, ${p.accent[0]} 40%, transparent)` }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "'Geist Mono', monospace", fontWeight: 600, textAlign: "right" }}>{fmtHM(mins)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        {/* Task distribution */}
        <div className="surface" style={{ padding: "16px 18px" }}>
          <SectionHeader title="Task distribution" subtitle={`${tasks.length} tasks by status`} />
          <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", gap: 12, height: 150 }}>
            {stats.statusCounts.map(({ s, n }) => {
              const meta = STATUS_META[s];
              return (
                <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%" }}>
                  <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div style={{ height: `${(n / stats.maxStatus) * 100}%`, minHeight: n ? 6 : 0, background: meta.color, borderRadius: 6, boxShadow: `0 0 10px color-mix(in oklab, ${meta.color} 45%, transparent)` }} />
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{n}</div>
                  <Eyebrow size={9}>{meta.label}</Eyebrow>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project health */}
        <div className="surface" style={{ padding: "16px 18px" }}>
          <SectionHeader title="Project health" subtitle="Lowest first — needs attention" />
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {[...projects].sort((a, b) => a.health - b.health).slice(0, 6).map((p) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                <ProgressBar pct={p.health} color={p.health > 75 ? "var(--success)" : p.health > 50 ? "var(--warning)" : "var(--danger)"} />
                <div style={{ justifySelf: "end" }}><StatusPill label={p.status.label} color={p.status.color} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
