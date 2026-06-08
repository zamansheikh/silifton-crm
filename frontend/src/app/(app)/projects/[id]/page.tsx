"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Icon,
  I,
  Avatar,
  AvatarStack,
  Eyebrow,
  StatusPill,
  ProgressBar,
  SectionHeader,
  GlowOrb,
  PRIORITY_COLOR,
} from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { TeamPicker } from "@/components/team-picker";
import { GradientPicker } from "@/components/color-picker";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { fmtBytes, readFileAsDataUrl, money } from "@/lib/format";
import type { Project, Task, ActivityItem, ProjectFile, Priority, TaskStatus } from "@/lib/types";

const TABS: [string, string][] = [
  ["overview", "Overview"],
  ["tasks", "Tasks"],
  ["files", "Files"],
  ["activity", "Activity"],
  ["team", "Team"],
];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { teamById, clientById, projectById, perms, openTask, version, bump } = useApp();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [tab, setTab] = useState("overview");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canManage = perms.projects;

  useEffect(() => {
    api.projects.get(id).then(setProject).catch(() => setProject(null));
    api.tasks.list({ project: id }).then(setTasks).catch(() => {});
    api.activity({ project: id }).then(setActivity).catch(() => {});
    api.projects.files.list(id).then(setFiles).catch(() => {});
  }, [id, version]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("Link copied to clipboard");
    } catch {
      setToast("Couldn't copy link");
    }
  };
  const togglePin = async () => {
    const updated = await api.projects.pin(id, !project?.pinned).catch(() => null);
    if (updated) { setProject(updated); setToast(updated.pinned ? "Pinned" : "Unpinned"); bump(); }
  };
  const removeProject = async () => {
    if (!confirm(`Delete "${p.name}"? This removes its tasks and files too.`)) return;
    await api.projects.remove(id).catch(() => {});
    bump();
    router.push("/projects");
  };

  const p = project ?? projectById[id];
  if (!p) {
    return <div style={{ padding: 40, color: "var(--text-sub)" }}>Loading project…</div>;
  }
  const client = clientById[p.client];
  const lead = teamById[p.lead];

  const groups = {
    todo: tasks.filter((t) => t.status === "todo" || t.status === "backlog"),
    doing: tasks.filter((t) => t.status === "doing"),
    review: tasks.filter((t) => t.status === "review"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const TaskLine = ({ t }: { t: Task }) => {
    const prioColor = PRIORITY_COLOR[t.priority];
    return (
      <div className="rt-row" onClick={() => openTask(t.id)} style={{ display: "grid", gridTemplateColumns: "20px 60px 1fr auto 80px 80px", gap: 12, alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--border)", cursor: "pointer" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ width: 16, height: 16, borderRadius: 5, background: t.status === "done" ? "var(--accent-grad)" : "transparent", border: t.status === "done" ? "none" : "1.5px solid var(--border-hi)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {t.status === "done" && <Icon d={I.check} size={9} color="#fff" stroke={2.5} />}
        </span>
        <span data-label="ID"><Eyebrow size={10}>{t.id}</Eyebrow></span>
        <div data-label="Task" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: t.status === "done" ? "var(--text-dim)" : "var(--text)", textDecoration: t.status === "done" ? "line-through" : "none", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
            {t.tags.map((tag) => <span key={tag} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--surface)", color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{tag}</span>)}
          </div>
        </div>
        <span data-label="Priority" style={{ fontSize: 10.5, color: prioColor, fontFamily: "'Geist Mono', monospace", padding: "2px 7px", borderRadius: 4, background: `color-mix(in oklab, ${prioColor} 14%, transparent)`, fontWeight: 600 }}>{t.priority}</span>
        <span data-label="Team"><AvatarStack people={t.assignees.map((mid) => teamById[mid]).filter(Boolean).map((m) => ({ name: m.name, bg: m.bg }))} size={20} max={3} /></span>
        <span data-label="Due" style={{ fontSize: 11, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace", textAlign: "right" }}>{t.due}</span>
      </div>
    );
  };

  const Sidebar = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="surface" style={{ padding: "14px 16px" }}>
        <Eyebrow>Progress</Eyebrow>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 36, color: "var(--text)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -1, lineHeight: 1 }}>{p.pct}<span style={{ fontSize: 18, color: "var(--text-dim)" }}>%</span></span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Health <b style={{ color: p.health > 75 ? "var(--success)" : p.health > 50 ? "var(--warning)" : "var(--danger)" }}>{p.health}/100</b></div>
          </div>
        </div>
        <ProgressBar pct={p.pct} color={p.accent[0]} height={6} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 2 }}>Hours logged</div>
            <div style={{ fontSize: 16, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{p.hours}h <span style={{ fontSize: 11, color: "var(--text-dim)" }}>/ {p.budget}h</span></div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 2 }}>Budget used</div>
            <div style={{ fontSize: 16, color: p.budget && p.hours / p.budget > 0.85 ? "var(--warning)" : "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{p.budget ? Math.round((p.hours / p.budget) * 100) : 0}%</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 2 }}>Tasks done</div>
            <div style={{ fontSize: 16, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{p.tasksDone}<span style={{ fontSize: 11, color: "var(--text-dim)" }}>/{p.tasksDone + p.tasksOpen}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 2 }}>Priority</div>
            <div style={{ fontSize: 16, color: PRIORITY_COLOR[p.priority], fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{p.priority}</div>
          </div>
        </div>
      </div>

      <div className="surface" style={{ padding: "14px 16px" }}>
        <SectionHeader title="Team" subtitle={`${p.team.length} contributors`} />
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {p.team.map((tid) => {
            const m = teamById[tid];
            if (!m) return null;
            return (
              <div key={tid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <Avatar name={m.name} bg={m.bg} size={28} ring={tid === p.lead ? p.accent[0] : undefined} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name} {tid === p.lead && <span style={{ fontSize: 9.5, color: p.accent[0], fontFamily: "'Geist Mono', monospace", marginLeft: 4 }}>LEAD</span>}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{m.title}</div>
                </div>
                <span style={{ fontSize: 10.5, color: m.status === "tracking" ? "var(--success)" : "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{m.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {client && (
        <div className="surface" style={{ padding: "14px 16px" }}>
          <Eyebrow>Client</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 9 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `color-mix(in oklab, ${client.color} 24%, var(--surface-hi))`, color: client.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", border: `1px solid color-mix(in oklab, ${client.color} 35%, transparent)` }}>{client.logo}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{client.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{client.industry} · {client.tier}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div><div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Billed</div><div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>{money(client.billed, client.currency, false)}</div></div>
            <div><div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Open</div><div style={{ fontSize: 14, color: client.outstanding ? "var(--warning)" : "var(--success)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>{money(client.outstanding, client.currency, false)}</div></div>
            <div><div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>MRR</div><div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>{money(client.mrr, client.currency, false)}</div></div>
          </div>
        </div>
      )}
    </div>
  );

  const ProjectActivity = () => (
    <div className="surface" style={{ padding: "14px 16px" }}>
      <SectionHeader title="Activity" subtitle="Recent updates" />
      <div style={{ marginTop: 12 }}>
        {activity.slice(0, 6).map((a, i) => {
          const m = teamById[a.who];
          if (!m) return null;
          return (
            <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <Avatar name={m.name} bg={m.bg} size={26} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: "var(--text-sub)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>{m.name.split(" ")[0]}</span> {a.action} <span style={{ color: "var(--accent-soft)" }}>{a.target}</span>
                </div>
                <Eyebrow size={10}>{a.time} · {a.kind}</Eyebrow>
              </div>
            </div>
          );
        })}
        {activity.length === 0 && <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "8px 0" }}>No recent activity.</div>}
      </div>
    </div>
  );

  const activeTasks = [...groups.doing, ...groups.review, ...groups.todo];

  return (
    <div style={{ flex: 1 }}>
      {/* Hero */}
      <div style={{ position: "relative", padding: "24px 26px 22px", background: `linear-gradient(135deg, color-mix(in oklab, ${p.accent[0]} 20%, var(--bg-deep)) 0%, color-mix(in oklab, ${p.accent[1]} 14%, var(--bg)) 60%, var(--bg) 100%)`, borderBottom: "1px solid var(--border)", overflow: "hidden" }}>
        <GlowOrb x="90%" y="20%" color={p.accent[0]} size={300} opacity={0.3} />
        <GlowOrb x="60%" y="100%" color={p.accent[1]} size={240} opacity={0.2} />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flex: 1, minWidth: 0 }}>
            <button onClick={() => router.push("/projects")} className="btn btn-icon" style={{ marginTop: 4 }}><Icon d={I.chevL} size={13} /></button>
            <div style={{ width: 58, height: 58, borderRadius: 12, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto", boxShadow: `0 8px 28px color-mix(in oklab, ${p.accent[0]} 40%, transparent)` }}>{p.code}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Eyebrow>{client?.name} · {p.priority}</Eyebrow>
                <StatusPill label={p.status.label} color={p.status.color} />
              </div>
              <div style={{ fontSize: 30, color: "var(--text)", fontWeight: 700, letterSpacing: -0.6, fontFamily: "'Inter Tight', sans-serif", lineHeight: 1.1 }}>{p.name}</div>
              <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12.5, color: "var(--text-sub)", flexWrap: "wrap" }}>
                <span>Started <b style={{ color: "var(--text)" }}>{p.start}</b></span>
                <span style={{ color: "var(--text-dim)" }}>·</span>
                <span>Due <b style={{ color: "var(--text)" }}>{p.deadline}</b></span>
                <span style={{ color: "var(--text-dim)" }}>·</span>
                <span>Lead <b style={{ color: "var(--text)" }}>{lead?.name ?? "—"}</b></span>
                <span style={{ color: "var(--text-dim)" }}>·</span>
                <span>{p.tasksOpen + p.tasksDone} tasks <span style={{ color: "var(--success)" }}>· {p.tasksDone} done</span></span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn" onClick={share}><Icon d={I.share} size={13} /> Share</button>
            <button className="btn" onClick={togglePin} style={p.pinned ? { color: "var(--warning)", borderColor: "color-mix(in oklab, var(--warning) 35%, transparent)" } : undefined}>
              <Icon d={I.star} size={13} fill={p.pinned ? "var(--warning)" : "none"} stroke={p.pinned ? "none" : 1.6} color={p.pinned ? "var(--warning)" : undefined} /> {p.pinned ? "Pinned" : "Pin"}
            </button>
            {canManage && <button className="btn" onClick={() => setShowEdit(true)}><Icon d={I.edit} size={13} /> Edit</button>}
            {perms.admin && <button className="btn btn-icon" title="Delete project" onClick={removeProject}><Icon d={I.trash} size={14} color="var(--danger)" /></button>}
            {canManage && <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon d={I.plus} size={13} /> Add task</button>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 0, marginTop: 22, borderBottom: "1px solid var(--border)", marginBottom: -23, position: "relative" }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: "10px 16px", fontSize: 12.5, fontWeight: 500, color: tab === k ? "var(--text)" : "var(--text-sub)", background: "transparent", border: "none", cursor: "pointer", borderBottom: tab === k ? `2px solid ${p.accent[0]}` : "2px solid transparent", marginBottom: -1, transition: "all .14s" }}>
              {k === "tasks" ? `Tasks · ${tasks.length}` : l}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div style={{ padding: "20px 22px", display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="surface" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 16px" }}>
                <SectionHeader title={`Active tasks · ${activeTasks.length}`} subtitle="In progress and queued" />
              </div>
              <div className="rt-head" style={{ display: "grid", gridTemplateColumns: "20px 60px 1fr auto 80px 80px", gap: 12, padding: "4px 14px" }}>
                <span /><Eyebrow size={10}>ID</Eyebrow><Eyebrow size={10}>Task</Eyebrow><Eyebrow size={10}>Prio</Eyebrow><Eyebrow size={10}>Owner</Eyebrow><Eyebrow size={10}>Due</Eyebrow>
              </div>
              {activeTasks.slice(0, 8).map((t) => <TaskLine key={t.id} t={t} />)}
              {activeTasks.length === 0 && <div style={{ padding: "20px 16px", color: "var(--text-dim)", fontSize: 12 }}>No active tasks.</div>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Sidebar />
            <ProjectActivity />
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div style={{ padding: "20px 22px" }}>
          <div className="surface" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SectionHeader title={`All tasks · ${tasks.length}`} />
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon d={I.plus} size={13} /> New task</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "20px 60px 1fr auto 80px 80px", gap: 12, padding: "4px 14px" }}>
              <span /><Eyebrow size={10}>ID</Eyebrow><Eyebrow size={10}>Task</Eyebrow><Eyebrow size={10}>Prio</Eyebrow><Eyebrow size={10}>Owner</Eyebrow><Eyebrow size={10}>Due</Eyebrow>
            </div>
            {tasks.map((t) => <TaskLine key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {tab === "files" && (
        <div style={{ padding: "20px 22px", maxWidth: 760 }}>
          <FilesTab projectId={id} files={files} onChange={setFiles} canManage={canManage} />
        </div>
      )}
      {tab === "activity" && (<div style={{ padding: "20px 22px", maxWidth: 700 }}><ProjectActivity /></div>)}
      {tab === "team" && (<div style={{ padding: "20px 22px", maxWidth: 420 }}><Sidebar /></div>)}

      {showAdd && (
        <AddTaskModal projectId={p.id} projectName={p.name} onClose={() => setShowAdd(false)} onCreated={() => { bump(); setShowAdd(false); }} />
      )}
      {showEdit && (
        <EditProjectModal project={p} onClose={() => setShowEdit(false)} onSaved={(up) => { setProject(up); bump(); setShowEdit(false); }} />
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 90, background: "var(--bg-elevate)", border: "1px solid var(--border-hi)", borderRadius: 10, padding: "10px 16px", fontSize: 12.5, color: "var(--text)", boxShadow: "0 12px 32px rgba(0,0,0,.4)", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={I.check} size={13} color="var(--success)" /> {toast}
        </div>
      )}
    </div>
  );
}

function FilesTab({
  projectId,
  files,
  onChange,
  canManage,
}: {
  projectId: string;
  files: ProjectFile[];
  onChange: (f: ProjectFile[]) => void;
  canManage: boolean;
}) {
  const { teamById } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setErr(null);
    setBusy(true);
    try {
      const next = [...files];
      for (const file of Array.from(fileList)) {
        const dataUrl = await readFileAsDataUrl(file);
        const created = await api.projects.files.upload(projectId, { name: file.name, dataUrl });
        next.unshift(created);
      }
      onChange(next);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (fileId: string) => {
    await api.projects.files.remove(projectId, fileId).catch(() => {});
    onChange(files.filter((f) => f.id !== fileId));
  };

  const extColor = (f: ProjectFile) => {
    if (f.resourceType === "image") return "var(--accent)";
    if (["pdf"].includes(f.format)) return "var(--danger)";
    if (["doc", "docx", "txt", "md"].includes(f.format)) return "var(--info)";
    return "var(--success)";
  };

  return (
    <div className="surface" style={{ padding: "14px 16px" }}>
      <SectionHeader
        title="Files"
        subtitle={`${files.length} upload${files.length === 1 ? "" : "s"} · stored on Cloudinary`}
        action={
          <>
            <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
            <button className="btn btn-primary" style={{ fontSize: 12 }} disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? <Icon d={I.refresh} size={12} style={{ animation: "spin .8s linear infinite" }} /> : <Icon d={I.plus} size={12} />} {busy ? "Uploading…" : "Upload"}
            </button>
          </>
        }
      />
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>{err}</div>}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
        style={{ marginTop: 12 }}
      >
        {files.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-dim)", border: "1.5px dashed var(--border-hi)", borderRadius: 10, fontSize: 13 }}>
            Drag files here or hit Upload.
          </div>
        )}
        {files.map((f, i) => {
          const who = teamById[f.uploadedBy];
          const color = extColor(f);
          return (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: `color-mix(in oklab, ${color} 18%, transparent)`, color, fontFamily: "'Geist Mono', monospace", fontSize: 9.5, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`, textTransform: "uppercase" }}>
                {(f.format || f.resourceType || "file").slice(0, 4)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{f.name}</a>
                <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{who?.name.split(" ")[0] ?? "Someone"} · {fmtBytes(f.bytes)}</div>
              </div>
              <a href={f.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon" title="Open"><Icon d={I.download} size={13} /></a>
              {canManage && <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => remove(f.id)}><Icon d={I.trash} size={13} /></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: (p: Project) => void;
}) {
  const { clients } = useApp();
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.client);
  const [priority, setPriority] = useState<Priority>(project.priority);
  const [deadline, setDeadline] = useState(project.deadline);
  const [start, setStart] = useState(project.start === "—" ? "" : project.start);
  const [pct, setPct] = useState(project.pct);
  const [budget, setBudget] = useState(project.budget);
  const [tags, setTags] = useState(project.tags.join(", "));
  const [statusLabel, setStatusLabel] = useState(project.status.label);
  const [team, setTeam] = useState<string[]>(project.team ?? []);
  const [lead, setLead] = useState(project.lead ?? "");
  const [accent, setAccent] = useState<[string, string]>(project.accent ?? ["#a855f7", "#f472b6"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const STATUS_OPTS: { label: string; color: string }[] = [
    { label: "On track", color: "var(--success)" },
    { label: "At risk", color: "var(--warning)" },
    { label: "Blocked", color: "var(--danger)" },
    { label: "In review", color: "var(--accent)" },
    { label: "Review", color: "var(--accent)" },
    { label: "Done", color: "var(--success)" },
  ];

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const status = STATUS_OPTS.find((s) => s.label === statusLabel) ?? project.status;
      const up = await api.projects.update(project.id, {
        name,
        client,
        priority,
        deadline,
        pct,
        budget,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status,
        start: start || undefined,
        team,
        lead: lead || undefined,
        accent,
      });
      onSaved(up);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save project");
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit project" subtitle={project.name} onClose={onClose}>
      <Field label="Project name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Client">
          <select className="input" value={client} onChange={(e) => setClient(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)}>
            {[...new Set(STATUS_OPTS.map((s) => s.label))].map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Priority">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Progress %"><input className="input" type="number" value={pct} onChange={(e) => setPct(Number(e.target.value))} /></Field>
        <Field label="Budget (h)"><input className="input" type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Start"><DateField value={start} onChange={setStart} placeholder="Pick a start date" /></Field>
        <Field label="Deadline"><DateField value={deadline} onChange={setDeadline} placeholder="Pick a deadline" /></Field>
      </div>
      <Field label="Tags"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
      <Field label="Team (★ marks the lead)">
        <TeamPicker team={team} lead={lead} onChange={({ team, lead }) => { setTeam(team); setLead(lead); }} />
      </Field>
      <Field label="Accent">
        <GradientPicker value={accent} onChange={setAccent} />
      </Field>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !name}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </Modal>
  );
}

function AddTaskModal({
  projectId,
  projectName,
  onClose,
  onCreated,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [est, setEst] = useState(4);
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.tasks.create({ title, project: projectId, status, priority, est, due: due || undefined });
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not create task");
      setBusy(false);
    }
  };

  return (
    <Modal title="Add task" subtitle={`To ${projectName}`} onClose={onClose}>
      <Field label="Title">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write the migration runbook" autoFocus />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {[["backlog", "Backlog"], ["todo", "To do"], ["doing", "In progress"], ["review", "In review"], ["done", "Done"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {["Low", "Medium", "High", "Critical"].map((pr) => <option key={pr}>{pr}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Estimate (h)">
          <input className="input" type="number" value={est} onChange={(e) => setEst(Number(e.target.value))} />
        </Field>
        <Field label="Due">
          <DateField value={due} onChange={setDue} placeholder="Pick a due date" />
        </Field>
      </div>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !title}>{busy ? "Adding…" : "Add task"}</button>
      </div>
    </Modal>
  );
}
