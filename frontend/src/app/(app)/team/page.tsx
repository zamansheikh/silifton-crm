"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon, I, Avatar, Eyebrow, ProgressBar, SectionHeader } from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import type { Member } from "@/lib/types";

const STATUS_META: Record<string, { color: string; label: string }> = {
  tracking: { color: "var(--success)", label: "Tracking time" },
  meeting: { color: "var(--warning)", label: "In meeting" },
  idle: { color: "var(--info)", label: "Available" },
  offline: { color: "var(--text-dim)", label: "Offline" },
};

export default function TeamPage() {
  const { user, team, projects, perms, bump } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [showInvite, setShowInvite] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  useEffect(() => {
    if (params.get("invite") === "1") setShowInvite(true);
  }, [params]);

  const canInvite = perms.projects;
  const canManage = perms.projects;
  const order: Record<string, number> = { tracking: 0, meeting: 1, idle: 2, offline: 3 };
  const sorted = [...team].sort((a, b) => order[a.status] - order[b.status]);
  const filtered = sorted.filter((m) => {
    if (filter === "all") return true;
    if (filter === "tracking") return m.status === "tracking";
    if (filter === "available") return m.status === "idle" || m.status === "meeting";
    return m.role.toLowerCase() === filter;
  });

  const tracking = team.filter((t) => t.status === "tracking").length;
  const avgUtil = team.length ? Math.round(team.reduce((a, t) => a + t.util, 0) / team.length) : 0;
  const blended = team.length ? Math.round(team.reduce((a, t) => a + t.hourly, 0) / team.length) : 0;

  const stats = [
    { label: "Headcount", value: team.length, sub: "across roles", color: "var(--accent)", icon: <Icon d={I.team} size={12} /> },
    { label: "Tracking now", value: tracking, sub: "live timers", color: "var(--success)", icon: <Icon d={I.zap} size={12} /> },
    { label: "Avg utilization", value: avgUtil + "%", sub: "this week", color: avgUtil > 85 ? "var(--warning)" : "var(--info)", icon: <Icon d={I.trend} size={12} /> },
    { label: "Blended rate", value: "৳" + blended.toLocaleString(), sub: "per hour", color: "var(--accent-2)", icon: <Icon d={I.dollar} size={12} /> },
  ];

  const chips: [string, string, number][] = [
    ["all", "All", team.length],
    ["tracking", "Tracking", tracking],
    ["available", "Available", team.filter((t) => t.status === "idle" || t.status === "meeting").length],
    ["dev", "Dev", team.filter((t) => t.role === "Dev").length],
    ["design", "Design", team.filter((t) => t.role === "Design").length],
    ["pm", "PM", team.filter((t) => t.role === "PM").length],
    ["qa", "QA", team.filter((t) => t.role === "QA").length],
  ];

  const PersonCard = ({ m }: { m: Member }) => {
    const s = STATUS_META[m.status];
    const memberProjects = projects.filter((p) => p.team.includes(m.id));
    return (
      <div className="surface" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 4, background: m.bg, opacity: 0.8 }} />
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ position: "relative", flex: "0 0 auto" }}>
              <Avatar name={m.name} bg={m.bg} size={46} />
              <span className={m.status === "tracking" ? "pulse" : ""} style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: 99, background: s.color, boxShadow: `0 0 0 2.5px var(--bg), 0 0 8px ${s.color}` }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, letterSpacing: -0.2 }}>{m.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 1 }}>{m.title}</div>
              <div style={{ fontSize: 10.5, color: s.color, fontFamily: "'Geist Mono', monospace", letterSpacing: 0.4, marginTop: 4 }}>{s.label.toUpperCase()}</div>
            </div>
            <span style={{ fontSize: 10, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace", padding: "2px 7px", borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)", fontWeight: 600, flex: "0 0 auto" }}>{m.role.toUpperCase()}</span>
          </div>

          {m.status === "tracking" && (
            <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, background: "color-mix(in oklab, var(--success) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--success) 26%, transparent)", borderRadius: 8 }}>
              <span className="pulse" style={{ width: 6, height: 6, borderRadius: 99, background: "var(--success)", boxShadow: "0 0 6px var(--success)", flex: "0 0 auto" }} />
              <span style={{ fontSize: 11.5, color: "var(--text)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.mood}</span>
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <Eyebrow>Utilization</Eyebrow>
              <span style={{ fontSize: 13, color: m.util > 90 ? "var(--warning)" : m.util > 60 ? "var(--text)" : "var(--text-dim)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{m.util}<span style={{ fontSize: 10, color: "var(--text-dim)" }}>%</span></span>
            </div>
            <ProgressBar pct={m.util} color={m.util > 90 ? "var(--warning)" : "var(--accent)"} height={4} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: "auto" }}>
            {memberProjects.slice(0, 3).map((p) => (
              <span key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 99, background: `color-mix(in oklab, ${p.accent[0]} 12%, transparent)`, color: p.accent[0], border: `1px solid color-mix(in oklab, ${p.accent[0]} 24%, transparent)`, cursor: "pointer", fontWeight: 500, fontFamily: "'Geist Mono', monospace", letterSpacing: 0.3 }}>{p.code}</span>
            ))}
            {memberProjects.length > 3 && <span style={{ fontSize: 10.5, padding: "3px 8px", color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>+{memberProjects.length - 3}</span>}
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}><span style={{ color: "var(--text)", fontWeight: 600 }}>৳{m.hourly.toLocaleString()}</span>/hr</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-ghost btn-icon" title="Email"><Icon d={I.mail} size={13} /></button>
            {(canManage || m.id === user.id) && (
              <button className="btn btn-ghost btn-icon" title="Edit member" onClick={() => setEditing(m)}><Icon d={I.edit} size={13} /></button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const heatProjects = projects.slice(0, 6);
  const cellColor = (pid: string, mid: string) => {
    const p = projects.find((x) => x.id === pid)!;
    if (!p.team.includes(mid)) return null;
    const intensity = (p.team.indexOf(mid) + 1) / p.team.length;
    return `color-mix(in oklab, ${p.accent[0]} ${30 + intensity * 50}%, transparent)`;
  };

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Workspace</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Team
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· {team.length} members · {tracking} tracking now</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setShowCapacity(true)}><Icon d={I.trend} size={13} /> Capacity planner</button>
          {canInvite && <button className="btn btn-primary" onClick={() => setShowInvite(true)}><Icon d={I.plus} size={13} /> Invite member</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {stats.map((s) => (
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

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {chips.map(([k, l, n]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, color: filter === k ? "#fff" : "var(--text-sub)", background: filter === k ? "var(--accent-grad)" : "var(--surface)", border: filter === k ? "none" : "1px solid var(--border)", borderRadius: 99, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: filter === k ? "0 2px 8px color-mix(in oklab, var(--accent) 40%, transparent)" : "none" }}>
            {l} <span className="mono" style={{ fontSize: 10, opacity: 0.8 }}>{n}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {filtered.map((m) => <PersonCard key={m.id} m={m} />)}
      </div>

      {/* Heatmap */}
      <div className="surface" style={{ padding: "16px 18px", overflow: "hidden" }}>
        <SectionHeader title="Workload heatmap" subtitle="Members × active projects · intensity by load" />
        <div style={{ marginTop: 14, overflowX: "auto" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}><Eyebrow>Member</Eyebrow></th>
                {heatProjects.map((p) => (
                  <th key={p.id} style={{ padding: "6px 4px" }}>
                    <div title={p.name} style={{ width: 30, height: 30, borderRadius: 6, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{p.code}</div>
                  </th>
                ))}
                <th><Eyebrow>Util</Eyebrow></th>
              </tr>
            </thead>
            <tbody>
              {team.slice(0, 11).map((m) => (
                <tr key={m.id}>
                  <td style={{ padding: "4px 8px 4px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={m.name} bg={m.bg} size={22} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap" }}>{m.name}</div>
                        <Eyebrow size={9}>{m.role}</Eyebrow>
                      </div>
                    </div>
                  </td>
                  {heatProjects.map((p) => {
                    const c = cellColor(p.id, m.id);
                    return (
                      <td key={p.id} style={{ padding: 2 }}>
                        <div title={p.team.includes(m.id) ? `${m.name} on ${p.name}` : "Not assigned"} style={{ width: 34, height: 28, borderRadius: 5, background: c || "var(--surface)", border: c ? `1px solid color-mix(in oklab, ${p.accent[0]} 35%, transparent)` : "1px solid var(--border)" }} />
                      </td>
                    );
                  })}
                  <td style={{ paddingLeft: 8, fontSize: 12, color: m.util > 90 ? "var(--warning)" : "var(--text)", fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>{m.util}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => { setShowInvite(false); if (params.get("invite")) router.replace("/team"); }}
          onInvited={() => { bump(); setShowInvite(false); }}
        />
      )}
      {editing && (
        <EditMemberModal
          member={editing}
          canManage={canManage}
          isSelf={editing.id === user.id}
          canDelete={perms.admin && editing.id !== user.id}
          onClose={() => setEditing(null)}
          onSaved={() => { bump(); setEditing(null); }}
        />
      )}
      {showCapacity && (
        <CapacityModal team={team} projects={projects} onClose={() => setShowCapacity(false)} />
      )}
    </div>
  );
}

function EditMemberModal({
  member,
  canManage,
  isSelf,
  canDelete,
  onClose,
  onSaved,
}: {
  member: Member;
  canManage: boolean;
  isSelf: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [title, setTitle] = useState(member.title);
  const [jobRole, setJobRole] = useState(member.role);
  const [appRole, setAppRole] = useState(member.appRole);
  const [status, setStatus] = useState(member.status);
  const [mood, setMood] = useState(member.mood);
  const [hourly, setHourly] = useState(member.hourly);
  const [util, setUtil] = useState(member.util);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      const body: Partial<Member> = canManage
        ? { name, title, role: jobRole, appRole, status, mood, hourly, util }
        : { name, title, status, mood };
      await api.team.update(member.id, body);
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save member");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove ${member.name} from the studio?`)) return;
    setBusy(true);
    try {
      await api.team.remove(member.id);
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not remove member");
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit member" subtitle={member.email} onClose={onClose}>
      <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Member["status"])}>
            {["tracking", "idle", "meeting", "offline"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Current focus"><input className="input" value={mood} onChange={(e) => setMood(e.target.value)} /></Field>
      </div>
      {canManage && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Job role">
              <select className="input" value={jobRole} onChange={(e) => setJobRole(e.target.value as Member["role"])}>
                {["Founder", "PM", "Dev", "Design", "QA", "Ops"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Access level">
              <select className="input" value={appRole} onChange={(e) => setAppRole(e.target.value as Member["appRole"])}>
                {["founder", "director", "pm", "accountant", "auditor", "dev"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Rate (৳/hr)"><input className="input" type="number" value={hourly} onChange={(e) => setHourly(Number(e.target.value))} /></Field>
            <Field label="Utilization %"><input className="input" type="number" value={util} onChange={(e) => setUtil(Number(e.target.value))} /></Field>
          </div>
        </>
      )}
      {!canManage && isSelf && <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 10 }}>You can update your own name, title, status and focus. Rate and role are managed by an admin.</div>}
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>{canDelete && <button className="btn" onClick={remove} disabled={busy} style={{ color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 35%, transparent)" }}><Icon d={I.trash} size={13} /> Remove</button>}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !name}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}

function CapacityModal({
  team,
  projects,
  onClose,
}: {
  team: Member[];
  projects: { id: string; team: string[]; accent: [string, string]; code: string }[];
  onClose: () => void;
}) {
  const rows = [...team]
    .filter((m) => m.status !== "offline")
    .sort((a, b) => b.util - a.util)
    .map((m) => ({ m, count: projects.filter((p) => p.team.includes(m.id)).length }));
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.m.util, 0) / rows.length) : 0;
  const over = rows.filter((r) => r.m.util > 90).length;

  return (
    <Modal title="Capacity planner" subtitle={`Avg ${avg}% · ${over} over capacity`} onClose={onClose} width={620}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(({ m, count }) => {
          const band = m.util > 90 ? "var(--danger)" : m.util > 75 ? "var(--warning)" : "var(--success)";
          return (
            <div key={m.id} className="rt-row" style={{ display: "grid", gridTemplateColumns: "160px 1fr 120px", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <Avatar name={m.name} bg={m.bg} size={26} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                  <Eyebrow size={9}>{m.role}</Eyebrow>
                </div>
              </div>
              <div data-label="Utilization"><ProgressBar pct={m.util} color={band} /></div>
              <div data-label="Load" style={{ textAlign: "right", fontSize: 11.5, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>
                <span style={{ color: band, fontWeight: 600 }}>{m.util}%</span> · {count} proj
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-dim)" }}>
        Members above 90% are at risk of burnout — consider rebalancing their projects. Offline members are hidden.
      </div>
    </Modal>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Dev");
  const [appRole, setAppRole] = useState<Member["appRole"]>("dev");
  const [title, setTitle] = useState("");
  const [hourly, setHourly] = useState(120);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // When the job role changes, suggest the matching access level (still overridable).
  const onRoleChange = (r: string) => {
    setMemberRole(r);
    setAppRole(r === "Founder" ? "founder" : r === "PM" ? "pm" : "dev");
  };

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.team.invite({ name, email, role: memberRole, appRole, title: title || memberRole, hourly });
      onInvited();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not invite member");
      setBusy(false);
    }
  };

  return (
    <Modal title="Invite member" subtitle="They'll join the studio with a default password (silifton)." onClose={onClose}>
      <Field label="Full name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" autoFocus />
      </Field>
      <Field label="Email">
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@silifton.com" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Job role">
          <select className="input" value={memberRole} onChange={(e) => onRoleChange(e.target.value)}>
            {["Founder", "PM", "Dev", "Design", "QA", "Ops"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Access level">
          <select className="input" value={appRole} onChange={(e) => setAppRole(e.target.value as Member["appRole"])}>
            {["founder", "director", "pm", "accountant", "auditor", "dev"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Rate (৳/hr)">
          <input className="input" type="number" value={hourly} onChange={(e) => setHourly(Number(e.target.value))} />
        </Field>
        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Engineer" />
        </Field>
      </div>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !name || !email}>{busy ? "Inviting…" : "Send invite"}</button>
      </div>
    </Modal>
  );
}
