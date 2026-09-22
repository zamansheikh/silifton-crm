"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, I, SectionHeader } from "@/components/primitives";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import type { WebInquiry } from "@/lib/types";
import { Banner, Chip, Empty, Loading, PageHeader, STATUS_COLOR, TableHead, pageStyle, rowStyle } from "@/components/website/ui";

const STATUSES: WebInquiry["status"][] = ["New", "In review", "Replied", "Won", "Closed"];
const PRIORITIES: WebInquiry["priority"][] = ["Low", "Medium", "High", "Critical"];
const TEMPLATE = "90px 1fr 110px 90px 90px";

export default function WebsiteInquiriesPage() {
  const { perms } = useApp();
  const canEdit = perms.projects;
  const [items, setItems] = useState<WebInquiry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | WebInquiry["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.website.inquiries.list();
      setItems(data);
      setSelectedId((cur) => (cur && data.some((x) => x.id === cur) ? cur : data[0]?.id ?? null));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load inquiries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((x) => x.id === selectedId) ?? null;

  const patch = async (id: string, body: Partial<Pick<WebInquiry, "status" | "priority">>) => {
    setBusy(true);
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...body } : x)));
    try {
      await api.website.inquiries.update(id, body);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (q: WebInquiry) => {
    if (!confirm(`Archive the inquiry from ${q.name} (${q.company})?`)) return;
    setBusy(true);
    try {
      await api.website.inquiries.remove(q.id);
      setItems((prev) => prev.filter((x) => x.id !== q.id));
      setSelectedId((cur) => (cur === q.id ? null : cur));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const filtered = items.filter((q) => (filter === "all" ? true : filter === "open" ? !["Won", "Closed"].includes(q.status) : q.status === filter));
  const newCount = items.filter((q) => q.status === "New").length;
  const awaiting = items.filter((q) => !["Won", "Closed"].includes(q.status)).length;

  const chips: Array<[typeof filter, string, number]> = [
    ["all", "All", items.length],
    ["open", "Open", awaiting],
    ["New", "New", newCount],
    ["Replied", "Replied", items.filter((q) => q.status === "Replied").length],
    ["Won", "Won", items.filter((q) => q.status === "Won").length],
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Inquiries"
        meta={`${newCount} new · ${awaiting} awaiting reply`}
        actions={
          <button className="btn" onClick={() => exportCsv("inquiries.csv", filtered.map((q) => ({ id: q.id, name: q.name, company: q.company, email: q.email, subject: q.subject, budget: q.budget, status: q.status, priority: q.priority, date: q.date })))}>
            <Icon d={I.download} size={12} /> Export CSV
          </button>
        }
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {chips.map(([k, l, n]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, color: filter === k ? "#fff" : "var(--text-sub)", background: filter === k ? "var(--accent-grad)" : "var(--surface)", border: filter === k ? "none" : "1px solid var(--border)", borderRadius: 99, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {l} <span className="mono" style={{ fontSize: 10, opacity: 0.8 }}>{n}</span>
          </button>
        ))}
      </div>

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1.5fr 1fr" : "1fr", gap: 16, alignItems: "start" }}>
        <div className="surface" style={{ overflow: "hidden" }}>
          <TableHead cols={["ID", "From", "Budget", "Status", "Received"]} template={TEMPLATE} />
          {loading && items.length === 0 ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <Empty>No inquiries here.</Empty>
          ) : (
            filtered.map((q, i) => (
              <div
                key={q.id}
                className="rt-row"
                onClick={() => setSelectedId(q.id)}
                style={{ ...rowStyle(TEMPLATE, i === 0), cursor: "pointer", background: selectedId === q.id ? "color-mix(in oklab, var(--accent) 8%, transparent)" : undefined }}
              >
                <span className="mono" data-label="ID" style={{ fontSize: 11.5, color: "var(--accent-soft)" }}>{q.id}</span>
                <div data-label="From" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.name} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· {q.company}</span></div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.subject}</div>
                </div>
                <div data-label="Budget"><Chip label={q.budget} /></div>
                <div data-label="Status"><Chip label={q.status} color={STATUS_COLOR[q.status]} /></div>
                <span className="mono" data-label="Received" style={{ fontSize: 11, color: "var(--text-dim)" }}>{q.date.slice(0, 10)}</span>
              </div>
            ))
          )}
        </div>

        {selected && (
          <div className="surface" style={{ padding: "16px 18px", position: "sticky", top: 0 }}>
            <SectionHeader
              title={selected.name}
              subtitle={`${selected.company} · ${selected.id}`}
              action={<Chip label={selected.priority} color={STATUS_COLOR[selected.priority]} />}
            />
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "90px 1fr", rowGap: 8, fontSize: 13, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Email</span>
              <a href={`mailto:${selected.email}`} style={{ color: "var(--accent-soft)", wordBreak: "break-all" }}>{selected.email}</a>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Budget</span>
              <span style={{ color: "var(--text)" }}>{selected.budget}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Received</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--text-sub)" }}>{selected.date.slice(0, 19).replace("T", " ")}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Status</span>
              <select className="input" value={selected.status} disabled={busy || !canEdit} onChange={(e) => void patch(selected.id, { status: e.target.value as WebInquiry["status"] })} style={{ maxWidth: 180 }}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Priority</span>
              <select className="input" value={selected.priority} disabled={busy || !canEdit} onChange={(e) => void patch(selected.id, { priority: e.target.value as WebInquiry["priority"] })} style={{ maxWidth: 180 }}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>{selected.subject}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap" }}>{selected.message}</div>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="btn btn-primary" href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}>
                <Icon d={I.mail} size={12} /> Reply
              </a>
              {canEdit && (
                <button className="btn" disabled={busy} onClick={() => void patch(selected.id, { status: selected.status === "Replied" ? "In review" : "Replied" })}>
                  {selected.status === "Replied" ? "Mark in review" : "Mark replied"}
                </button>
              )}
              {canEdit && (
                <button className="btn btn-ghost" disabled={busy} onClick={() => void remove(selected)} style={{ color: "var(--danger)", marginLeft: "auto" }}>
                  <Icon d={I.trash} size={12} /> Archive
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
