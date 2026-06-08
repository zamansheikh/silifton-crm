"use client";

import { useEffect, useState } from "react";
import {
  Icon,
  I,
  Avatar,
  Eyebrow,
  StatusPill,
  ProgressBar,
  PRIORITY_COLOR,
  STATUS_META,
} from "./primitives";
import { DateField } from "./date-field";
import { useApp } from "@/providers/app";
import { useTimer, formatHMS } from "@/providers/timer";
import { api } from "@/lib/api";
import type { Task, TaskStatus, Priority, TaskComment } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const STATUS_ORDER: TaskStatus[] = ["backlog", "todo", "doing", "review", "done"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];

const Meta = ({ label, content }: { label: string; content: React.ReactNode }) => (
  <div>
    <Eyebrow>{label}</Eyebrow>
    <div style={{ marginTop: 6 }}>{content}</div>
  </div>
);

export function TaskDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { user, perms, team, teamById, projectById, clientById, bump } = useApp();
  const { timer, displayMs, start, stop } = useTimer();
  const canManage = perms.projects;
  const canWrite = perms.canWrite; // non-auditor: may check subtasks, comment, log time
  const [editAssignees, setEditAssignees] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [t, setT] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [draft, setDraft] = useState("");
  const [newSub, setNewSub] = useState("");
  const [saving, setSaving] = useState(false);
  const [logMins, setLogMins] = useState(30);

  const refetch = () => api.tasks.get(taskId).then(setT).catch(() => {});
  const loadComments = () => api.tasks.comments.list(taskId).then(setComments).catch(() => {});
  useEffect(() => {
    let live = true;
    api.tasks.get(taskId).then((task) => live && setT(task)).catch(() => {});
    api.tasks.comments.list(taskId).then((c) => live && setComments(c)).catch(() => {});
    return () => {
      live = false;
    };
  }, [taskId]);

  const timerOnThisTask = timer?.task === taskId;

  if (!t) {
    return (
      <>
        <div onClick={onClose} style={scrim} />
        <div style={{ ...drawer, alignItems: "center", justifyContent: "center" }}>
          <Icon d={I.refresh} size={20} color="var(--accent-soft)" style={{ animation: "spin .8s linear infinite" }} />
        </div>
      </>
    );
  }

  const p = projectById[t.project];
  const client = p ? clientById[p.client] : undefined;
  const accent = p?.accent ?? ["#a855f7", "#f472b6"];
  const prio = PRIORITY_COLOR[t.priority];
  const statusInfo = STATUS_META[t.status];

  const patch = async (body: Partial<Task>) => {
    setSaving(true);
    try {
      const updated = await api.tasks.update(t.id, body);
      setT(updated);
      bump();
    } finally {
      setSaving(false);
    }
  };

  const logTime = async () => {
    setSaving(true);
    try {
      await api.time.log({ project: t.project, task: t.id, mins: logMins, billable: true, note: `Logged from ${t.id}` });
      const updated = await api.tasks.get(t.id);
      setT(updated);
      bump();
    } finally {
      setSaving(false);
    }
  };

  const addSubtask = async () => {
    const title = newSub.trim();
    if (!title) return;
    setNewSub("");
    setT(await api.tasks.subtasks.add(t.id, title));
    bump();
  };
  const toggleSubtask = async (sid: string, done: boolean) => {
    setT(await api.tasks.subtasks.update(t.id, sid, { done }));
    bump();
  };
  const removeSubtask = async (sid: string) => {
    setT(await api.tasks.subtasks.remove(t.id, sid));
    bump();
  };

  const addComment = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    await api.tasks.comments.add(t.id, body);
    await loadComments();
    refetch();
    bump();
  };
  const removeComment = async (cid: string) => {
    await api.tasks.comments.remove(t.id, cid).catch(() => {});
    await loadComments();
    refetch();
  };

  const deleteTask = async () => {
    if (!confirm(`Delete task ${t.id}? This can't be undone.`)) return;
    await api.tasks.remove(t.id).catch(() => {});
    bump();
    onClose();
  };
  const toggleAssignee = (mid: string) => {
    const next = t.assignees.includes(mid) ? t.assignees.filter((a) => a !== mid) : [...t.assignees, mid];
    patch({ assignees: next });
  };
  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || t.tags.includes(tag)) { setNewTag(""); return; }
    setNewTag("");
    patch({ tags: [...t.tags, tag] });
  };
  const removeTag = (tag: string) => patch({ tags: t.tags.filter((x) => x !== tag) });

  return (
    <>
      <div onClick={onClose} style={scrim} />
      <div className="surface-frosted task-drawer" style={drawer}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent[0]}, ${accent[1]})`, flex: "0 0 auto" }} />

        {/* Header */}
        <div style={{ padding: "14px 22px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", flex: "0 0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-sub)", minWidth: 0 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto" }}>{p?.code}</span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.name}</span>
            <Icon d={I.chevR} size={11} color="var(--text-dim)" />
            <Eyebrow color="var(--text)">{t.id}</Eyebrow>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {saving && <Icon d={I.refresh} size={13} color="var(--accent-soft)" style={{ animation: "spin .8s linear infinite", alignSelf: "center" }} />}
            <button className="btn btn-icon" title="Copy link" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/projects/${t.project}`).catch(() => {})}><Icon d={I.link} size={13} /></button>
            {canManage && <button className="btn btn-icon" title="Delete task" onClick={deleteTask}><Icon d={I.trash} size={13} color="var(--danger)" /></button>}
            <button onClick={onClose} className="btn btn-icon" title="Close"><Icon d={I.x} size={14} /></button>
          </div>
        </div>

        <div className="task-drawer-body" style={{ flex: 1, overflow: "auto", display: "grid", gridTemplateColumns: "1fr 248px" }}>
          {/* Main */}
          <div style={{ padding: "22px 24px", borderRight: "1px solid var(--border)" }}>
            {/* Status mover */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {STATUS_ORDER.map((s) => {
                const meta = STATUS_META[s];
                const active = t.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => !active && patch({ status: s })}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 99,
                      cursor: active ? "default" : "pointer",
                      border: `1px solid ${active ? `color-mix(in oklab, ${meta.color} 40%, transparent)` : "var(--border)"}`,
                      color: active ? meta.color : "var(--text-dim)",
                      background: active ? `color-mix(in oklab, ${meta.color} 16%, transparent)` : "transparent",
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <input
              key={t.id}
              defaultValue={t.title}
              readOnly={!canManage}
              onFocus={(e) => { if (canManage) e.currentTarget.style.borderColor = "var(--border-hi)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; const v = e.target.value.trim(); if (v && v !== t.title) patch({ title: v }); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              title={canManage ? "Click to rename" : undefined}
              style={{ width: "100%", fontSize: 24, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, margin: "14px 0 8px", marginLeft: -6, lineHeight: 1.2, fontFamily: "'Inter Tight', sans-serif", background: "transparent", border: "1px solid transparent", borderRadius: 8, padding: "2px 6px", outline: "none", cursor: canManage ? "text" : "default" }}
            />
            <div style={{ fontSize: 13.5, color: "var(--text-sub)", lineHeight: 1.65 }}>
              {p?.name} for {client?.name ?? "—"}. Tracked in the {statusInfo.label.toLowerCase()} column with {t.priority.toLowerCase()} priority.
            </div>

            {/* Time */}
            <div className="surface" style={{ marginTop: 18, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Eyebrow>Time</Eyebrow>
                {canWrite && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {timerOnThisTask ? (
                    <button className="btn" style={{ fontSize: 11, padding: "4px 10px", color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 35%, transparent)" }} onClick={async () => { await stop(); refetch(); }}>
                      <span className="pulse" style={{ width: 6, height: 6, borderRadius: 99, background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
                      {formatHMS(displayMs)} · stop
                    </button>
                  ) : (
                    <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => start({ project: t.project, task: t.id, note: t.title, billable: true })} disabled={!!timer} title={timer ? "Another timer is running" : "Start a timer for this task"}>
                      <Icon d={I.play} size={10} fill="currentColor" stroke="none" /> Start
                    </button>
                  )}
                  <select value={logMins} onChange={(e) => setLogMins(Number(e.target.value))} className="input" style={{ width: "auto", padding: "3px 8px", fontSize: 11 }}>
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>{m}m</option>
                    ))}
                  </select>
                  <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={logTime} disabled={saving}>
                    <Icon d={I.plus} size={10} /> Log
                  </button>
                </div>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 22, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.5 }}>{t.spent}h</span>
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>logged of {t.est}h estimate</span>
              </div>
              <ProgressBar pct={t.est ? Math.min(100, (t.spent / t.est) * 100) : 0} color={t.spent > t.est ? "var(--warning)" : accent[0]} height={5} />
              {t.spent > t.est * 0.85 && t.spent < t.est && (
                <div style={{ fontSize: 11.5, color: "var(--warning)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon d={I.zap} size={11} /> Approaching estimate — flag for re-scoping?
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, margin: 0, fontFamily: "'Inter Tight', sans-serif" }}>
                  Subtasks <span style={{ color: "var(--text-dim)", fontWeight: 400, marginLeft: 6 }}>· {t.done} of {t.subtasks}</span>
                </h3>
              </div>
              {(t.subtasks ?? 0) > 0 && (
                <ProgressBar pct={t.subtasks ? (t.done / t.subtasks) * 100 : 0} color={accent[0]} height={4} />
              )}
              <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
                {(t.checklist ?? []).map((s, i) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <button onClick={() => canWrite && toggleSubtask(s.id, !s.done)} disabled={!canWrite} style={{ width: 16, height: 16, borderRadius: 5, background: s.done ? "var(--accent-grad)" : "transparent", border: s.done ? "none" : "1.5px solid var(--border-hi)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", cursor: canWrite ? "pointer" : "default", padding: 0 }}>
                      {s.done && <Icon d={I.check} size={9} color="#fff" stroke={2.5} />}
                    </button>
                    <span style={{ fontSize: 13, color: s.done ? "var(--text-dim)" : "var(--text)", textDecoration: s.done ? "line-through" : "none", flex: 1 }}>{s.title}</span>
                    {canWrite && <button onClick={() => removeSubtask(s.id)} className="btn btn-ghost btn-icon" style={{ width: 22, height: 22 }} title="Remove"><Icon d={I.x} size={11} /></button>}
                  </div>
                ))}
              </div>
              {canWrite && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input
                    className="input"
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
                    placeholder="Add a subtask…"
                    style={{ fontSize: 12.5, padding: "7px 10px" }}
                  />
                  <button className="btn" onClick={addSubtask} disabled={!newSub.trim()}><Icon d={I.plus} size={12} /> Add</button>
                </div>
              )}
            </div>

            {/* Discussion */}
            <div style={{ marginTop: 26 }}>
              <h3 style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, margin: "0 0 14px", fontFamily: "'Inter Tight', sans-serif" }}>
                Discussion <span style={{ color: "var(--text-dim)", fontWeight: 400, marginLeft: 6 }}>· {comments.length}</span>
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
                {comments.map((c) => {
                  const m = teamById[c.author];
                  const mine = c.author === user.id;
                  return (
                    <div key={c.id} style={{ display: "flex", gap: 12 }}>
                      <Avatar name={m?.name ?? "?"} bg={m?.bg} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{m?.name ?? "Unknown"}</span>
                          {m && <Eyebrow size={10}>{m.role}</Eyebrow>}
                          <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>{timeAgo(c.createdAt)}</span>
                          {mine && <button onClick={() => removeComment(c.id)} className="btn btn-ghost btn-icon" style={{ width: 20, height: 20 }} title="Delete"><Icon d={I.trash} size={11} /></button>}
                        </div>
                        <div className="surface" style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--text-sub)", lineHeight: 1.55 }}>{c.body}</div>
                      </div>
                    </div>
                  );
                })}
                {comments.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-dim)", fontStyle: "italic", fontFamily: "'Instrument Serif', serif" }}>No comments yet — start the thread.</div>}
              </div>

              {canWrite && (
                <div className="surface" style={{ padding: 12 }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addComment(); }}
                    placeholder="Leave a comment…  (⌘↵ to send)"
                    rows={2}
                    className="input"
                    style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingTop: 10, borderTop: "1px solid var(--border)", marginTop: 10 }}>
                    <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={addComment} disabled={!draft.trim()}>Comment ⌘↵</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side meta */}
          <div style={{ padding: "22px 18px", display: "flex", flexDirection: "column", gap: 18, background: "var(--surface)" }}>
            <Meta label="Status" content={<StatusPill label={statusInfo.label} color={statusInfo.color} />} />
            <Meta
              label="Priority"
              content={
                <select
                  value={t.priority}
                  onChange={(e) => patch({ priority: e.target.value as Priority })}
                  className="input"
                  style={{ padding: "5px 8px", fontSize: 12.5, color: prio, fontWeight: 600 }}
                >
                  {PRIORITIES.map((pr) => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
              }
            />
            <Meta
              label="Assignees"
              content={
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {t.assignees.map((id) => {
                    const m = teamById[id];
                    if (!m) return null;
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={m.name} bg={m.bg} size={22} />
                        <span style={{ fontSize: 12.5, color: "var(--text)", flex: 1 }}>{m.name}</span>
                        {canManage && <button className="btn btn-ghost btn-icon" style={{ width: 18, height: 18 }} title="Remove" onClick={() => toggleAssignee(id)}><Icon d={I.x} size={10} /></button>}
                      </div>
                    );
                  })}
                  {canManage && (
                    <>
                      <button className="btn btn-ghost" style={{ fontSize: 11, justifyContent: "flex-start", padding: "4px 4px" }} onClick={() => setEditAssignees((v) => !v)}>
                        <Icon d={I.plus} size={11} /> {editAssignees ? "Done" : "Assign"}
                      </button>
                      {editAssignees && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
                          {team.filter((m) => !t.assignees.includes(m.id)).map((m) => (
                            <button key={m.id} onClick={() => toggleAssignee(m.id)} title={m.name} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 7px 3px 3px", borderRadius: 99, border: "1px solid var(--border)", background: "var(--surface-solid)", cursor: "pointer", fontSize: 11, color: "var(--text-sub)" }}>
                              <Avatar name={m.name} bg={m.bg} size={16} /> {m.name.split(" ")[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              }
            />
            <Meta
              label="Due date"
              content={
                canManage ? (
                  <DateField value={t.due} onChange={(v) => { if (v && v !== t.due) patch({ due: v }); }} placeholder="Set due date" />
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text)" }}>
                    <Icon d={I.cal} size={12} color="var(--accent-soft)" /> {t.due}
                  </span>
                )
              }
            />
            <Meta
              label="Estimate"
              content={
                canManage ? (
                  <input
                    key={t.id + t.est}
                    type="number"
                    defaultValue={t.est}
                    onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== t.est) patch({ est: v }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="input"
                    style={{ padding: "5px 8px", fontSize: 12.5 }}
                  />
                ) : (
                  <span style={{ fontSize: 12.5, color: "var(--text)" }}>{t.est}h</span>
                )
              }
            />
            <Meta
              label="Project"
              content={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{p?.code}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{client?.name}</div>
                  </div>
                </div>
              }
            />
            <Meta
              label="Tags"
              content={
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {t.tags.map((tag) => (
                    <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, padding: "2px 7px", borderRadius: 99, background: "var(--surface-solid)", border: "1px solid var(--border-hi)", color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>
                      {tag}
                      {canManage && <button onClick={() => removeTag(tag)} title="Remove tag" style={{ border: "none", background: "transparent", color: "var(--text-dim)", cursor: "pointer", padding: 0, display: "inline-flex" }}><Icon d={I.x} size={9} /></button>}
                    </span>
                  ))}
                  {canManage && (
                    <input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
                      onBlur={addTag}
                      placeholder="+ tag"
                      style={{ width: 64, fontSize: 10.5, padding: "2px 7px", borderRadius: 99, background: "transparent", border: "1px dashed var(--border-hi)", color: "var(--text)", outline: "none", fontFamily: "'Geist Mono', monospace" }}
                    />
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}

const scrim: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "var(--scrim)",
  zIndex: 50,
  backdropFilter: "blur(4px)",
  animation: "scrim-in .2s ease-out",
};
const drawer: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: "min(720px, 92vw)",
  background: "var(--bg)",
  borderLeft: "1px solid var(--border-hi)",
  borderRadius: 0,
  boxShadow: "-20px 0 60px rgba(0,0,0,.4)",
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  animation: "drawer-in .26s cubic-bezier(.2,.7,.3,1)",
};
