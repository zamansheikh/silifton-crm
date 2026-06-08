"use client";

import { useEffect, useState } from "react";
import {
  Icon,
  I,
  Eyebrow,
  ProgressBar,
  AvatarStack,
  PRIORITY_COLOR,
} from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { MemberMultiSelect } from "@/components/team-picker";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import type { Task, TaskStatus, Priority } from "@/lib/types";

const COLS: { id: TaskStatus; label: string; color: string; icon: string }[] = [
  { id: "backlog", label: "Backlog", color: "var(--text-dim)", icon: I.archive },
  { id: "todo", label: "To do", color: "var(--info)", icon: I.list },
  { id: "doing", label: "In progress", color: "var(--accent)", icon: I.zap },
  { id: "review", label: "In review", color: "var(--warning)", icon: I.flag },
  { id: "done", label: "Done", color: "var(--success)", icon: I.check },
];

const THIS_WEEK = ["May 24", "May 26", "May 27", "May 28", "May 29", "May 30"];

export default function TasksPage() {
  const { openTask, teamById, projectById, projects, user, perms, version, bump } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"kanban" | "list" | "calendar">("kanban");
  const [scope, setScope] = useState<"all" | "mine" | "week" | "overdue">("all");
  const [showNew, setShowNew] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    api.tasks.list().then(setTasks).catch(() => {});
  }, [version]);

  const scoped = tasks.filter((t) => {
    if (scope === "mine") return t.assignees.includes(user.id);
    if (scope === "week") return THIS_WEEK.includes(t.due);
    if (scope === "overdue") return t.due === "May 24" && t.status !== "done";
    return true;
  });

  const counts = {
    all: tasks.length,
    mine: tasks.filter((t) => t.assignees.includes(user.id)).length,
    week: tasks.filter((t) => THIS_WEEK.includes(t.due)).length,
    overdue: tasks.filter((t) => t.due === "May 24" && t.status !== "done").length,
  };

  const moveTask = async (id: string, status: TaskStatus) => {
    if (!perms.canWrite) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await api.tasks.update(id, { status });
      bump();
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)));
    }
  };

  const TaskCard = ({ t }: { t: Task }) => {
    const p = projectById[t.project];
    const accent = p?.accent ?? ["#a855f7", "#f472b6"];
    const prio = PRIORITY_COLOR[t.priority];
    return (
      <div
        draggable={perms.canWrite}
        onDragStart={() => setDragId(t.id)}
        onDragEnd={() => setDragId(null)}
        onClick={() => openTask(t.id)}
        style={{ padding: "12px 13px", borderRadius: 10, background: "var(--surface-solid)", border: "1px solid var(--border)", cursor: "grab", position: "relative", overflow: "hidden", boxShadow: "0 1px 0 rgba(255,255,255,.02) inset", transition: "transform .12s, border-color .12s, box-shadow .12s", opacity: dragId === t.id ? 0.4 : 1 }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${accent[0]}, ${accent[1]})` }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, marginLeft: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`, color: "#fff", fontSize: 8.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter Tight', sans-serif" }}>{p?.code}</span>
            <Eyebrow size={10}>{t.id}</Eyebrow>
          </div>
          {t.priority !== "Low" && (
            <span style={{ fontSize: 9.5, color: prio, fontFamily: "'Geist Mono', monospace", padding: "1px 6px", borderRadius: 3, background: `color-mix(in oklab, ${prio} 16%, transparent)`, fontWeight: 600, letterSpacing: 0.4 }}>
              {t.priority === "Critical" ? "!!" : t.priority === "High" ? "!" : t.priority.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, lineHeight: 1.4, marginLeft: 3 }}>{t.title}</div>
        {t.tags.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap", marginLeft: 3 }}>
            {t.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, background: "var(--surface)", color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{tag}</span>
            ))}
          </div>
        )}
        {t.subtasks > 0 && (
          <div style={{ marginTop: 9, marginLeft: 3 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <Eyebrow size={9}>{t.done}/{t.subtasks} subtasks</Eyebrow>
              <Eyebrow size={9}>{t.est ? Math.round((t.spent / t.est) * 100) : 0}% time</Eyebrow>
            </div>
            <ProgressBar pct={(t.done / t.subtasks) * 100} color={accent[0]} height={3} glow={false} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginLeft: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10.5, color: "var(--text-dim)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Icon d={I.cal} size={10} /> {t.due}</span>
            {t.comments > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Icon d={I.msg} size={10} /> {t.comments}</span>}
            {t.spent > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: t.spent > t.est ? "var(--warning)" : "var(--text-dim)" }}><Icon d={I.time} size={10} /> {t.spent}h</span>}
          </div>
          <AvatarStack people={t.assignees.map((id) => teamById[id]).filter(Boolean).map((m) => ({ name: m.name, bg: m.bg }))} size={18} max={3} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "20px 22px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Workspace</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Tasks
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· {tasks.length} across {projects.length} projects</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon d={I.download} size={13} /> Export</button>
          {perms.canWrite && <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon d={I.plus} size={13} /> New task</button>}
        </div>
      </div>

      <div style={{ padding: "0 22px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 9, padding: 3 }}>
          {([["all", "All tasks"], ["mine", "Mine"], ["week", "This week"], ["overdue", "Overdue"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setScope(k)} style={{ padding: "5px 11px", fontSize: 12, color: scope === k ? "#fff" : "var(--text-sub)", background: scope === k ? "var(--accent-grad)" : "transparent", borderRadius: 6, fontWeight: 500, cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: 6 }}>
              {l}<span style={{ fontSize: 10, opacity: 0.8, fontFamily: "'Geist Mono', monospace" }}>{counts[k]}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
          {([["kanban", I.kanban, "Board"], ["list", I.list, "List"], ["calendar", I.cal, "Calendar"]] as const).map(([k, ic, label]) => (
            <button key={k} onClick={() => setView(k)} style={{ padding: "5px 11px", display: "flex", alignItems: "center", gap: 6, background: view === k ? "var(--surface-hi)" : "transparent", color: view === k ? "var(--text)" : "var(--text-dim)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11.5, fontWeight: 500 }}>
              <Icon d={ic} size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: view === "kanban" ? "hidden" : "auto" }}>
        {view === "kanban" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, padding: "4px 22px 24px", flex: 1, minHeight: 0, height: "100%" }}>
            {COLS.map((col) => {
              const items = scoped.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dragId && moveTask(dragId, col.id)}
                  style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "color-mix(in oklab, var(--surface) 40%, transparent)", border: `1px solid ${dragId ? "var(--border-hi)" : "var(--border)"}`, borderRadius: 12, overflow: "hidden" }}
                >
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${col.color}, transparent)`, opacity: 0.6 }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: col.color, display: "flex" }}><Icon d={col.icon} size={11} /></span>
                      <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{col.label}</span>
                      <span style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace", padding: "1px 6px", borderRadius: 4, background: "var(--surface)" }}>{items.length}</span>
                    </div>
                  </div>
                  <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 9, overflow: "auto", flex: 1, minHeight: 0 }}>
                    {items.map((t) => <TaskCard key={t.id} t={t} />)}
                    {items.length === 0 && (
                      <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--text-dim)", fontSize: 11, fontStyle: "italic", fontFamily: "'Instrument Serif', serif" }}>Drop here.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "list" && <ListView tasks={scoped} />}
        {view === "calendar" && <CalendarView tasks={scoped} />}
      </div>

      {showNew && (
        <NewTaskModal
          projects={projects}
          onClose={() => setShowNew(false)}
          onCreated={() => { bump(); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function ListView({ tasks }: { tasks: Task[] }) {
  const { openTask, teamById, projectById } = useApp();
  const groups: [string, Task[]][] = [
    ["In progress", tasks.filter((t) => t.status === "doing")],
    ["In review", tasks.filter((t) => t.status === "review")],
    ["To do", tasks.filter((t) => t.status === "todo")],
    ["Backlog", tasks.filter((t) => t.status === "backlog")],
    ["Done", tasks.filter((t) => t.status === "done")],
  ];
  const cols = "24px 60px 50px 1fr 100px 80px 80px 80px";
  return (
    <div style={{ padding: "4px 22px 24px" }}>
      <div className="surface" style={{ overflow: "hidden" }}>
        {groups.map(([label, items], gi) =>
          items.length > 0 ? (
            <div key={label}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", borderTop: gi ? "1px solid var(--border)" : "none", background: "var(--surface)" }}>
                <Icon d={I.chevD} size={11} color="var(--text-sub)" />
                <span style={{ fontSize: 11.5, color: "var(--text)", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{items.length}</span>
              </div>
              <div className="rt-head" style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "6px 16px", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)" }}>
                {["", "ID", "Proj", "Title", "Priority", "Team", "Logged", "Due"].map((h, i) => <Eyebrow key={i} size={10}>{h}</Eyebrow>)}
              </div>
              {items.map((t) => {
                const p = projectById[t.project];
                const accent = p?.accent ?? ["#a855f7", "#f472b6"];
                const prio = PRIORITY_COLOR[t.priority];
                return (
                  <div key={t.id} className="rt-row" onClick={() => openTask(t.id)} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "10px 16px", borderTop: "1px solid var(--border)", alignItems: "center", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: t.status === "done" ? "var(--accent-grad)" : "transparent", border: t.status === "done" ? "none" : "1.5px solid var(--border-hi)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {t.status === "done" && <Icon d={I.check} size={9} color="#fff" stroke={2.5} />}
                    </span>
                    <span data-label="ID"><Eyebrow size={10}>{t.id}</Eyebrow></span>
                    <span data-label="Project" style={{ width: 28, height: 22, borderRadius: 5, background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`, color: "#fff", fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter Tight', sans-serif" }}>{p?.code}</span>
                    <div data-label="Title" style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: t.status === "done" ? "var(--text-dim)" : "var(--text)", textDecoration: t.status === "done" ? "line-through" : "none", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                    </div>
                    <span data-label="Priority" style={{ fontSize: 10.5, color: prio, fontFamily: "'Geist Mono', monospace", padding: "2px 7px", borderRadius: 4, background: `color-mix(in oklab, ${prio} 14%, transparent)`, fontWeight: 600, justifySelf: "start" }}>{t.priority}</span>
                    <span data-label="Team"><AvatarStack people={t.assignees.map((id) => teamById[id]).filter(Boolean).map((m) => ({ name: m.name, bg: m.bg }))} size={20} max={3} /></span>
                    <span data-label="Logged" style={{ fontSize: 11.5, color: t.spent > t.est ? "var(--warning)" : "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{t.spent}/{t.est}h</span>
                    <span data-label="Due" style={{ fontSize: 11.5, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{t.due}</span>
                  </div>
                );
              })}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  const { openTask, projectById } = useApp();
  const days: { m: string; d: number; full: string; dim?: boolean }[] = [
    ...["Apr 27", "Apr 28", "Apr 29", "Apr 30"].map((p) => ({ m: "Apr", d: parseInt(p.split(" ")[1]), full: p, dim: true })),
    ...Array.from({ length: 31 }, (_, i) => ({ m: "May", d: i + 1, full: `May ${String(i + 1).padStart(2, "0")}` })),
    ...Array.from({ length: 7 }, (_, i) => ({ m: "Jun", d: i + 1, full: `Jun ${String(i + 1).padStart(2, "0")}`, dim: true })),
  ];
  const byDay: Record<string, Task[]> = {};
  tasks.forEach((t) => {
    (byDay[t.due] ||= []).push(t);
  });
  const today = "May 26";
  return (
    <div style={{ padding: "4px 22px 24px" }}>
      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace", letterSpacing: 1, textTransform: "uppercase", borderRight: "1px solid var(--border)" }}>{d}</div>
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((w) => (
          <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: w < 5 ? "1px solid var(--border)" : "none" }}>
            {days.slice(w * 7, w * 7 + 7).map((day, di) => {
              const dayTasks = byDay[day.full] || [];
              const isToday = day.full === today;
              return (
                <div key={di} style={{ padding: 8, minHeight: 96, borderRight: di < 6 ? "1px solid var(--border)" : "none", background: isToday ? "color-mix(in oklab, var(--accent) 8%, transparent)" : day.dim ? "color-mix(in oklab, var(--bg-deep) 50%, transparent)" : "transparent", opacity: day.dim ? 0.55 : 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "#fff" : day.dim ? "var(--text-dim)" : "var(--text)", background: isToday ? "var(--accent-grad)" : "transparent", padding: isToday ? "2px 8px" : "2px 0", borderRadius: 99, fontFamily: "'Geist Mono', monospace" }}>{day.d}</span>
                    {dayTasks.length > 2 && <span style={{ fontSize: 9.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>+{dayTasks.length - 2}</span>}
                  </div>
                  {dayTasks.slice(0, 2).map((t) => {
                    const p = projectById[t.project];
                    const accent = p?.accent ?? ["#a855f7", "#f472b6"];
                    return (
                      <div key={t.id} onClick={() => openTask(t.id)} style={{ fontSize: 10.5, color: "#fff", padding: "3px 7px", borderRadius: 4, background: `linear-gradient(90deg, ${accent[0]}, ${accent[1]})`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500, cursor: "pointer", boxShadow: `0 1px 8px color-mix(in oklab, ${accent[0]} 40%, transparent)` }}>{t.title}</div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewTaskModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useApp();
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(projects[0]?.id ?? "");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [est, setEst] = useState(4);
  const [due, setDue] = useState("");
  const [assignees, setAssignees] = useState<string[]>([user.id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.tasks.create({ title, project, status, priority, est, due: due || undefined, assignees });
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not create task");
      setBusy(false);
    }
  };

  return (
    <Modal title="New task" subtitle="Add work to a project board." onClose={onClose}>
      <Field label="Title">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Implement webhook retries" autoFocus />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Project">
          <select className="input" value={project} onChange={(e) => setProject(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Priority">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Estimate (h)">
          <input className="input" type="number" value={est} onChange={(e) => setEst(Number(e.target.value))} />
        </Field>
        <Field label="Due">
          <DateField value={due} onChange={setDue} placeholder="Pick a due date" />
        </Field>
      </div>
      <Field label="Assignees">
        <MemberMultiSelect value={assignees} onChange={setAssignees} />
      </Field>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !title || !project}>{busy ? "Adding…" : "Add task"}</button>
      </div>
    </Modal>
  );
}
