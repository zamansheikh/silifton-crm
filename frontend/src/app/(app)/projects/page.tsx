"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Icon,
  I,
  Eyebrow,
  StatusPill,
  ProgressBar,
  AvatarStack,
} from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { TeamPicker } from "@/components/team-picker";
import { GradientPicker } from "@/components/color-picker";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import type { Project } from "@/lib/types";

const FILTERS: [string, string, (p: Project) => boolean][] = [
  ["all", "All", () => true],
  ["active", "Active", (p) => !["Done", "Completed"].includes(p.status.label)],
  ["risk", "At risk", (p) => ["At risk", "Blocked"].includes(p.status.label)],
  ["review", "In review", (p) => p.status.label.toLowerCase().includes("review")],
];

export default function ProjectsPage() {
  const { projects, clientById, teamById, clients, bump, perms } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") setShowNew(true);
  }, [params]);

  const canCreate = perms.projects;
  const filterFn = FILTERS.find((f) => f[0] === filter)![2];
  const filtered = projects
    .filter(
      (p) =>
        filterFn(p) &&
        (search === "" ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.tags.some((t) => t.includes(search.toLowerCase()))),
    )
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

  const ProjectCard = ({ p }: { p: Project }) => {
    const client = clientById[p.client];
    return (
      <div
        onClick={() => router.push(`/projects/${p.id}`)}
        className="surface"
        style={{ padding: 0, overflow: "hidden", cursor: "pointer", position: "relative", transition: "transform .15s, border-color .15s", display: "flex", flexDirection: "column" }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--border-hi)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        <div style={{ height: 6, background: `linear-gradient(90deg, ${p.accent[0]}, ${p.accent[1]})`, boxShadow: `0 0 14px color-mix(in oklab, ${p.accent[0]} 50%, transparent)` }} />
        <div style={{ padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto", boxShadow: `0 4px 14px color-mix(in oklab, ${p.accent[0]} 35%, transparent)` }}>{p.code}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: -0.2 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 1 }}>{client?.name} · {p.priority}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {p.pinned && <Icon d={I.star} size={13} fill="var(--warning)" stroke="none" color="var(--warning)" />}
              <StatusPill label={p.status.label} color={p.status.color} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {p.tags.map((t) => (
              <span key={t} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{t}</span>
            ))}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 18, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.5 }}>{p.pct}%</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{p.tasksDone}/{p.tasksDone + p.tasksOpen} tasks</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{p.hours}h / {p.budget}h</span>
            </div>
            <ProgressBar pct={p.pct} color={p.accent[0]} height={6} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 11, borderTop: "1px solid var(--border)" }}>
            <AvatarStack people={p.team.map((id) => teamById[id]).filter(Boolean).map((m) => ({ name: m.name, bg: m.bg }))} size={22} max={4} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{p.deadline}</span>
              <div style={{ width: 30, height: 30, position: "relative" }}>
                <svg width="30" height="30" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" stroke="var(--border)" strokeWidth="2.5" fill="none" />
                  <circle cx="18" cy="18" r="15" stroke={p.accent[0]} strokeWidth="2.5" fill="none" strokeDasharray={`${p.health * 0.94} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" style={{ filter: `drop-shadow(0 0 4px ${p.accent[0]})` }} />
                </svg>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--text)", fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>{p.health}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <Eyebrow>Workspace</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Projects
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 24, color: "var(--text-sub)", fontWeight: 400 }}>· {projects.length} active</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn" onClick={() => exportCsv("projects.csv", filtered.map((p) => ({ id: p.id, name: p.name, client: clientById[p.client]?.name ?? p.client, code: p.code, status: p.status.label, priority: p.priority, progress: `${p.pct}%`, hours: p.hours, budget: p.budget, deadline: p.deadline, health: p.health })))}><Icon d={I.download} size={13} /> Export</button>
          {canCreate && <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon d={I.plus} size={13} /> New project</button>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 9, padding: 3 }}>
          {FILTERS.map(([k, label, fn]) => {
            const n = projects.filter(fn).length;
            return (
              <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 11px", fontSize: 12, fontWeight: 500, color: filter === k ? "#fff" : "var(--text-sub)", background: filter === k ? "var(--accent-grad)" : "transparent", borderRadius: 6, cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: 6, boxShadow: filter === k ? "0 2px 8px color-mix(in oklab, var(--accent) 40%, transparent)" : "none" }}>
                {label}
                <span style={{ fontSize: 10, opacity: 0.8, fontFamily: "'Geist Mono', monospace" }}>{n}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 11px", background: "var(--surface-solid)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, minWidth: 220 }}>
            <Icon d={I.search} size={12} color="var(--text-dim)" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects, tags…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 12, fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
            {(["grid", "list"] as const).map((k) => (
              <button key={k} onClick={() => setView(k)} style={{ width: 28, height: 28, border: "none", background: view === k ? "var(--surface-hi)" : "transparent", color: view === k ? "var(--text)" : "var(--text-dim)", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={k === "grid" ? I.grid : I.list} size={13} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((p) => <ProjectCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="surface" style={{ overflow: "hidden" }}>
          <div className="rt-head" style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1fr 0.8fr 0.6fr 0.6fr 0.6fr", gap: 14, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
            {["Project", "Client", "Progress", "Team", "Due", "Budget", "Status"].map((h) => <Eyebrow key={h} size={10}>{h}</Eyebrow>)}
          </div>
          {filtered.map((p) => {
            const client = clientById[p.client];
            return (
              <div key={p.id} className="rt-row" onClick={() => router.push(`/projects/${p.id}`)} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1fr 0.8fr 0.6fr 0.6fr 0.6fr", gap: 14, padding: "13px 18px", borderTop: "1px solid var(--border)", alignItems: "center", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto" }}>{p.code}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.tags.join(" · ")}</div>
                  </div>
                </div>
                <div data-label="Client" style={{ fontSize: 12.5, color: "var(--text-sub)" }}>{client?.name}</div>
                <div data-label="Progress">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text)", fontFamily: "'Geist Mono', monospace" }}>{p.pct}%</span>
                    <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{p.tasksDone}/{p.tasksDone + p.tasksOpen}</span>
                  </div>
                  <ProgressBar pct={p.pct} color={p.accent[0]} height={4} />
                </div>
                <div data-label="Team"><AvatarStack people={p.team.map((id) => teamById[id]).filter(Boolean).map((m) => ({ name: m.name, bg: m.bg }))} size={22} max={4} /></div>
                <div data-label="Due" style={{ fontSize: 12, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{p.deadline}</div>
                <div data-label="Budget" style={{ fontSize: 11.5, color: p.hours > p.budget * 0.85 ? "var(--warning)" : "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{p.hours}/{p.budget}</div>
                <div data-label="Status"><StatusPill label={p.status.label} color={p.status.color} /></div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)", fontSize: 13 }}>No projects match.</div>
      )}

      {showNew && (
        <NewProjectModal
          clients={clients}
          onClose={() => {
            setShowNew(false);
            if (params.get("new")) router.replace("/projects");
          }}
          onCreated={(p) => {
            bump();
            setShowNew(false);
            router.push(`/projects/${p.id}`);
          }}
        />
      )}
    </div>
  );
}

function NewProjectModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const { user } = useApp();
  const [name, setName] = useState("");
  const [client, setClient] = useState(clients[0]?.id ?? "");
  const [priority, setPriority] = useState("Medium");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState(200);
  const [tags, setTags] = useState("");
  const [team, setTeam] = useState<string[]>([user.id]);
  const [lead, setLead] = useState(user.id);
  const [accent, setAccent] = useState<[string, string]>(["#a855f7", "#f472b6"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const p = await api.projects.create({
        name,
        client,
        priority: priority as Project["priority"],
        deadline: deadline || undefined,
        budget,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        team,
        lead: lead || undefined,
        accent,
      });
      onCreated(p);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not create project");
      setBusy(false);
    }
  };

  return (
    <Modal title="New project" subtitle="Spin up a workspace for a client engagement." onClose={onClose}>
      <Field label="Project name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme · Platform rebuild" autoFocus />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Client">
          <select className="input" value={client} onChange={(e) => setClient(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Deadline">
          <DateField value={deadline} onChange={setDeadline} placeholder="Pick a deadline" />
        </Field>
        <Field label="Budget (hrs)">
          <input className="input" type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Tags (comma separated)">
        <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="api, redesign" />
      </Field>
      <Field label="Team (★ marks the lead)">
        <TeamPicker team={team} lead={lead} onChange={({ team, lead }) => { setTeam(team); setLead(lead); }} />
      </Field>
      <Field label="Accent">
        <GradientPicker value={accent} onChange={setAccent} />
      </Field>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !name || !client}>{busy ? "Creating…" : "Create project"}</button>
      </div>
    </Modal>
  );
}
