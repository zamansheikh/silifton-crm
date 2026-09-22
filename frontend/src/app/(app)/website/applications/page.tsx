"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, I, Avatar, Eyebrow } from "@/components/primitives";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import type { WebApplication } from "@/lib/types";
import { Banner, Chip, Empty, Loading, PageHeader, STATUS_COLOR, TableHead, pageStyle, rowStyle } from "@/components/website/ui";

const STAGES: WebApplication["stage"][] = ["New", "Tech screen", "Portfolio review", "Hiring manager", "Onsite", "Offer", "Hired", "Rejected"];
const FUNNEL: WebApplication["stage"][] = ["New", "Tech screen", "Portfolio review", "Hiring manager", "Onsite", "Offer"];
const TEMPLATE = "90px 1fr 170px 150px 120px 90px 70px";

export default function WebsiteApplicationsPage() {
  const { perms } = useApp();
  const canEdit = perms.projects;
  const [items, setItems] = useState<WebApplication[]>([]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<"all" | "active" | WebApplication["stage"]>("active");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.website.applications.list());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: string, body: Partial<Pick<WebApplication, "stage" | "score">>) => {
    setBusy(true);
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...body } : a)));
    try {
      await api.website.applications.update(id, body);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: WebApplication) => {
    if (!confirm(`Delete the application from ${a.candidate}?`)) return;
    setBusy(true);
    try {
      await api.website.applications.remove(a.id);
      setItems((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const needle = q.trim().toLowerCase();
  const filtered = items.filter((a) => {
    if (stage === "active" && (a.stage === "Hired" || a.stage === "Rejected")) return false;
    if (stage !== "all" && stage !== "active" && a.stage !== stage) return false;
    if (!needle) return true;
    return a.candidate.toLowerCase().includes(needle) || a.role.toLowerCase().includes(needle) || a.email.toLowerCase().includes(needle);
  });
  const active = items.filter((a) => a.stage !== "Hired" && a.stage !== "Rejected").length;
  const counts: Record<string, number> = {};
  for (const s of FUNNEL) counts[s] = 0;
  for (const a of items) if (counts[a.stage] !== undefined) counts[a.stage] += 1;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Applications"
        meta={`${active} active candidates`}
        actions={
          <button className="btn" onClick={() => exportCsv("applications.csv", filtered.map((a) => ({ id: a.id, candidate: a.candidate, email: a.email, role: a.role, stage: a.stage, score: a.score, source: a.source, date: a.date })))}>
            <Icon d={I.download} size={12} /> Export CSV
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {FUNNEL.map((s, i) => (
          <button key={s} onClick={() => setStage(stage === s ? "active" : s)} className="surface" style={{ padding: "12px 14px", textAlign: "left", cursor: "pointer", borderColor: stage === s ? "var(--accent)" : undefined }}>
            <Eyebrow size={10}>Stage {i + 1}</Eyebrow>
            <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginTop: 4 }}>{s}</div>
            <div style={{ fontSize: 24, color: "var(--text)", fontWeight: 700, marginTop: 6, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.5 }}>{counts[s]}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", display: "flex" }}><Icon d={I.search} size={12} /></span>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidates or roles…" style={{ paddingLeft: 30, width: 260 }} />
        </div>
        <select className="input" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} style={{ width: "auto", fontSize: 12 }}>
          <option value="active">Active only</option>
          <option value="all">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      <div className="surface" style={{ overflow: "hidden" }}>
        <TableHead cols={["ID", "Candidate", "Applied for", "Stage", "Score", "Applied", ""]} template={TEMPLATE} />
        {loading && items.length === 0 ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty>{needle ? "No matches." : "No applications in this view."}</Empty>
        ) : (
          filtered.map((a, i) => (
            <div key={a.id}>
              <div className="rt-row" style={rowStyle(TEMPLATE, i === 0)}>
                <span className="mono" data-label="ID" style={{ fontSize: 11.5, color: "var(--accent-soft)" }}>{a.id}</span>
                <div data-label="Candidate" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar name={a.candidate} size={28} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.candidate}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.email} · {a.source}</div>
                  </div>
                </div>
                <span data-label="Applied for" style={{ fontSize: 12.5, color: "var(--text-sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.role}</span>
                <div data-label="Stage">
                  {canEdit ? (
                    <select className="input" value={a.stage} disabled={busy} onChange={(e) => void patch(a.id, { stage: e.target.value as WebApplication["stage"] })} style={{ fontSize: 12, padding: "4px 8px" }}>
                      {STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : (
                    <Chip label={a.stage} color={STATUS_COLOR[a.stage]} />
                  )}
                </div>
                <div data-label="Score" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: "var(--surface-hi)", borderRadius: 2, overflow: "hidden", minWidth: 40 }}>
                    <div style={{ width: `${a.score}%`, height: "100%", background: a.score > 85 ? "var(--success)" : a.score > 70 ? "var(--info)" : "var(--warning)" }} />
                  </div>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    value={a.score}
                    disabled={busy || !canEdit}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, score: n } : x)));
                    }}
                    onBlur={(e) => {
                      const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                      void patch(a.id, { score: n });
                    }}
                    style={{ width: 54, padding: "3px 6px", fontSize: 12, fontFamily: "'Geist Mono', monospace" }}
                  />
                </div>
                <span className="mono" data-label="Applied" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{a.date}</span>
                <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-icon" title="Details" onClick={() => setOpen(open === a.id ? null : a.id)}><Icon d={open === a.id ? I.chevU : I.chevD} size={13} /></button>
                  <a className="btn btn-ghost btn-icon" title="Email candidate" href={`mailto:${a.email}?subject=${encodeURIComponent(`Re: your application for ${a.role}`)}`}><Icon d={I.mail} size={13} /></a>
                  {canEdit && <button className="btn btn-ghost btn-icon" title="Delete" disabled={busy} onClick={() => void remove(a)} style={{ color: "var(--danger)" }}><Icon d={I.trash} size={13} /></button>}
                </div>
              </div>
              {open === a.id && (
                <div style={{ padding: "0 18px 14px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontSize: 12.5 }}>
                  <Detail label="LinkedIn" value={a.linkedin} link />
                  <Detail label="Portfolio" value={a.portfolio} link />
                  <Detail label="Note" value={a.note} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, link }: { label: string; value?: string; link?: boolean }) {
  return (
    <div style={{ padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
      <Eyebrow size={10}>{label}</Eyebrow>
      <div style={{ marginTop: 4, color: value ? "var(--text)" : "var(--text-dim)", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
        {value ? (link ? <a href={value} target="_blank" rel="noreferrer" style={{ color: "var(--accent-soft)" }}>{value}</a> : value) : "—"}
      </div>
    </div>
  );
}
