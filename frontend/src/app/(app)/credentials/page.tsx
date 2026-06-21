"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { Card, Icon, I, Eyebrow, Avatar, GlowOrb } from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { MemberMultiSelect } from "@/components/team-picker";
import type { Credential, CredentialCategory, CredentialField } from "@/lib/types";

const CATEGORIES: CredentialCategory[] = [
  "VPS", "Domain", "Database", "API", "Email", "Cloud", "Service", "Other",
];

const CATEGORY_COLOR: Record<CredentialCategory, string> = {
  VPS: "var(--accent)",
  Domain: "var(--info)",
  Database: "var(--success)",
  API: "var(--warning)",
  Email: "#a855f7",
  Cloud: "#06b6d4",
  Service: "#ec4899",
  Other: "var(--text-dim)",
};

interface Draft {
  id?: string;
  title: string;
  category: CredentialCategory;
  url: string;
  notes: string;
  fields: CredentialField[];
  tags: string[];
  sharedWith: string[];
}

const emptyDraft = (): Draft => ({
  title: "",
  category: "VPS",
  url: "",
  notes: "",
  fields: [
    { label: "Host", value: "", secret: false },
    { label: "Username", value: "", secret: false },
    { label: "Password", value: "", secret: true },
  ],
  tags: [],
  sharedWith: [],
});

const toDraft = (c: Credential): Draft => ({
  id: c.id,
  title: c.title,
  category: c.category,
  url: c.url ?? "",
  notes: c.notes ?? "",
  fields: c.fields?.length ? c.fields.map((f) => ({ ...f })) : [{ label: "", value: "", secret: false }],
  tags: c.tags ?? [],
  sharedWith: c.sharedWith ?? [],
});

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CredentialsPage() {
  const { role, teamById, bump } = useApp();
  const isFounder = role === "founder";

  const [items, setItems] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CredentialCategory | "all">("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [importItems, setImportItems] = useState<Credential[] | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.credentials.list());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((c) => {
      if (cat !== "all" && c.category !== cat) return false;
      if (!needle) return true;
      return (
        c.title.toLowerCase().includes(needle) ||
        c.url?.toLowerCase().includes(needle) ||
        c.tags?.some((t) => t.toLowerCase().includes(needle)) ||
        c.fields?.some((f) => !f.secret && f.value.toLowerCase().includes(needle))
      );
    });
  }, [items, q, cat]);

  const onDelete = async (c: Credential) => {
    if (!window.confirm(`Delete "${c.title}"? This can't be undone.`)) return;
    await api.credentials.remove(c.id).catch(() => {});
    load();
    bump();
  };

  const onExport = async () => {
    try {
      const data = await api.credentials.export();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`silifton-credentials-${stamp}.json`, data);
    } catch {
      alert("Export failed.");
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const arr = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(arr)) throw new Error("not an array");
      setImportItems(arr as Credential[]);
    } catch {
      alert("That file isn't a valid credentials JSON export.");
    }
  };

  const runImport = async (mode: "merge" | "replace") => {
    if (!importItems) return;
    setBusy(true);
    try {
      await api.credentials.import(importItems, mode);
      setImportItems(null);
      await load();
      bump();
    } catch (err) {
      alert(`Import failed: ${(err as ApiError).message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "26px 26px 60px", position: "relative" }}>
      <GlowOrb x="85%" y="-40px" color="var(--accent)" size={360} opacity={0.12} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <Eyebrow>System · Vault</Eyebrow>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.4, margin: "6px 0 0" }}>
            Credentials
          </h1>
          <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>
            {isFounder
              ? "Encrypted store for VPS, domains, databases & service secrets. Share entries with specific members."
              : "Credentials shared with you. Read-only."}
          </div>
        </div>
        {isFounder && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: "none" }} />
            <button className="btn btn-ghost" onClick={onPickFile} title="Import from JSON">
              <Icon d={I.upload} size={13} /> Import
            </button>
            <button className="btn btn-ghost" onClick={onExport} title="Export to JSON" disabled={items.length === 0}>
              <Icon d={I.download} size={13} /> Export
            </button>
            <button className="btn btn-primary" onClick={() => setEditing(emptyDraft())}>
              <Icon d={I.plus} size={13} /> New credential
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <Icon d={I.search} size={13} color="var(--text-dim)" />
          </span>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, url, tags…"
            style={{ paddingLeft: 30 }}
          />
        </div>
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value as CredentialCategory | "all")} style={{ width: 150 }}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: "auto" }}>
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-dim)", fontSize: 13, padding: "40px 0" }}>
          <Icon d={I.refresh} size={16} color="var(--accent-soft)" style={{ animation: "spin .8s linear infinite" }} /> Loading vault…
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <Icon d={I.key} size={28} color="var(--text-dim)" style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>{items.length === 0 ? "No credentials yet" : "No matches"}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>
            {items.length === 0
              ? isFounder
                ? "Add your first VPS, domain or service secret."
                : "Nothing has been shared with you yet."
              : "Try a different search or category."}
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 14 }}>
          {filtered.map((c) => (
            <CredentialCard
              key={c.id}
              cred={c}
              isFounder={isFounder}
              memberName={(id) => teamById[id]?.name}
              memberBg={(id) => teamById[id]?.bg}
              onEdit={() => setEditing(toDraft(c))}
              onDelete={() => onDelete(c)}
            />
          ))}
        </div>
      )}

      {editing && (
        <CredentialModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            bump();
          }}
        />
      )}

      {importItems && (
        <Modal title="Import credentials" subtitle={`${importItems.length} ${importItems.length === 1 ? "entry" : "entries"} found in file`} onClose={() => setImportItems(null)} width={420}>
          <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6, marginTop: 0 }}>
            <b>Merge</b> adds/updates entries by id and keeps the rest. <b>Replace</b> wipes the current vault first — this can&apos;t be undone.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => setImportItems(null)} disabled={busy}>Cancel</button>
            <button className="btn" onClick={() => runImport("replace")} disabled={busy} style={{ color: "var(--danger)" }}>
              Replace all
            </button>
            <button className="btn btn-primary" onClick={() => runImport("merge")} disabled={busy}>
              {busy ? "Importing…" : "Merge"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Single credential card with per-field reveal + copy ──────────────
function CredentialCard({
  cred,
  isFounder,
  memberName,
  memberBg,
  onEdit,
  onDelete,
}: {
  cred: Credential;
  isFounder: boolean;
  memberName: (id: string) => string | undefined;
  memberBg: (id: string) => string | undefined;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const color = CATEGORY_COLOR[cred.category] ?? "var(--text-dim)";

  const copy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(key);
        setTimeout(() => setCopied((k) => (k === key ? null : k)), 1200);
      },
      () => {},
    );
  };

  return (
    <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color, background: `color-mix(in oklab, ${color} 16%, transparent)`, padding: "2px 7px", borderRadius: 5 }}>
              {cred.category}
            </span>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 8, fontFamily: "'Inter Tight', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {cred.title}
            </div>
            {cred.url && (
              <a href={cred.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "var(--accent-soft)", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Icon d={I.link} size={11} /> {cred.url.replace(/^https?:\/\//, "").slice(0, 36)}
              </a>
            )}
          </div>
          {isFounder && (
            <div style={{ display: "flex", gap: 2 }}>
              <button className="btn btn-icon" onClick={onEdit} title="Edit"><Icon d={I.edit} size={13} /></button>
              <button className="btn btn-icon" onClick={onDelete} title="Delete"><Icon d={I.trash} size={13} color="var(--danger)" /></button>
            </div>
          )}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {cred.fields.map((f, i) => {
            const show = !f.secret || revealed[i];
            const key = `${cred.id}:${i}`;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-solid)", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 8px" }}>
                <span style={{ fontSize: 10.5, color: "var(--text-dim)", width: 78, flex: "0 0 auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
                  {f.label}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: "'Geist Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)" }}>
                  {show ? (f.value || <span style={{ color: "var(--text-dim)" }}>—</span>) : "••••••••••"}
                </span>
                {f.secret && (
                  <button className="btn btn-icon" onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))} title={show ? "Hide" : "Reveal"} style={{ width: 24, height: 24, flex: "0 0 auto" }}>
                    <Icon d={show ? I.eyeOff : I.eye} size={12} />
                  </button>
                )}
                <button className="btn btn-icon" onClick={() => copy(key, f.value)} title="Copy" disabled={!f.value} style={{ width: 24, height: 24, flex: "0 0 auto" }}>
                  <Icon d={copied === key ? I.check : I.copy} size={12} color={copied === key ? "var(--success)" : undefined} />
                </button>
              </div>
            );
          })}
        </div>

        {cred.notes && (
          <div style={{ fontSize: 11.5, color: "var(--text-sub)", lineHeight: 1.5, whiteSpace: "pre-wrap", borderLeft: "2px solid var(--border)", paddingLeft: 8 }}>
            {cred.notes}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 4, flexWrap: "wrap" }}>
          {cred.tags?.map((t) => (
            <span key={t} style={{ fontSize: 10, color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 99, padding: "1px 7px" }}>#{t}</span>
          ))}
          {isFounder && cred.sharedWith.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }} title={`Shared with ${cred.sharedWith.length} member(s)`}>
              <Icon d={I.share} size={11} color="var(--text-dim)" />
              <div style={{ display: "inline-flex" }}>
                {cred.sharedWith.slice(0, 4).map((id) => (
                  <Avatar key={id} name={memberName(id) ?? "?"} bg={memberBg(id)} size={18} ring="var(--ring-bg)" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Create / edit modal (founder only) ───────────────────────────────
function CredentialModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Draft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const setField = (i: number, patch: Partial<CredentialField>) =>
    set({ fields: draft.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const addField = () => set({ fields: [...draft.fields, { label: "", value: "", secret: false }] });
  const removeField = (i: number) => set({ fields: draft.fields.filter((_, j) => j !== i) });

  const save = async () => {
    if (!draft.title.trim()) {
      setError("Give it a title.");
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      title: draft.title.trim(),
      category: draft.category,
      url: draft.url.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      fields: draft.fields.filter((f) => f.label.trim()),
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      sharedWith: draft.sharedWith,
    };
    try {
      if (draft.id) await api.credentials.update(draft.id, body);
      else await api.credentials.create(body);
      onSaved();
    } catch (err) {
      setError((err as ApiError).message ?? "Save failed");
      setBusy(false);
    }
  };

  return (
    <Modal title={draft.id ? "Edit credential" : "New credential"} onClose={onClose} width={560}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 12 }}>
        <Field label="Title">
          <input className="input" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Hetzner VPS — prod" autoFocus />
        </Field>
        <Field label="Category">
          <select className="input" value={draft.category} onChange={(e) => set({ category: e.target.value as CredentialCategory })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <Field label="URL / endpoint (optional)">
        <input className="input" value={draft.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://console.hetzner.cloud" />
      </Field>

      {/* Dynamic fields */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600, display: "block", marginBottom: 6 }}>Fields</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {draft.fields.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input className="input" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Label" style={{ flex: "0 0 130px" }} />
              <input
                className="input"
                type={f.secret ? "password" : "text"}
                value={f.value}
                onChange={(e) => setField(i, { value: e.target.value })}
                placeholder="Value"
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-icon"
                type="button"
                title={f.secret ? "Secret (masked)" : "Plain"}
                onClick={() => setField(i, { secret: !f.secret })}
                style={{ flex: "0 0 auto", color: f.secret ? "var(--warning)" : "var(--text-dim)" }}
              >
                <Icon d={f.secret ? I.lock : I.eye} size={13} />
              </button>
              <button className="btn btn-icon" type="button" title="Remove" onClick={() => removeField(i)} style={{ flex: "0 0 auto" }}>
                <Icon d={I.x} size={13} />
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost" type="button" onClick={addField} style={{ marginTop: 8, fontSize: 12 }}>
          <Icon d={I.plus} size={12} /> Add field
        </button>
      </div>

      <Field label="Notes (optional)">
        <textarea className="input" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} placeholder="Anything else worth recording…" style={{ resize: "vertical" }} />
      </Field>

      <Field label="Tags (comma-separated)">
        <input className="input" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="prod, hetzner, eu-central" />
      </Field>

      <Field label="Share with members">
        <MemberMultiSelect value={draft.sharedWith} onChange={(ids) => set({ sharedWith: ids })} />
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
          Selected members can view (read-only) this credential. You always have full access.
        </div>
      </Field>

      {error && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !draft.title.trim()}>
          {busy ? "Saving…" : draft.id ? "Save changes" : "Create"}
        </button>
      </div>
    </Modal>
  );
}
