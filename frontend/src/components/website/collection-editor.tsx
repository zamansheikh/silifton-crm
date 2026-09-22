"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, I } from "@/components/primitives";
import { Modal } from "@/components/modal";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import type { WebItem } from "@/lib/types";
import type { CollectionDef } from "./collections";
import { FieldsForm, fromForm, missingRequired, toForm, type FormState } from "./fields";
import { Banner, Empty, Loading, SITE_URL, TableHead, rowStyle } from "./ui";

// Generic list + create/edit/delete for one public-site collection.
export function CollectionEditor({ def }: { def: CollectionDef }) {
  const { perms } = useApp();
  const canEdit = perms.projects;
  const [items, setItems] = useState<WebItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<WebItem | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.website.content.list(def.key);
      setItems(def.sort ? [...data].sort(def.sort) : data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load content");
    } finally {
      setLoading(false);
    }
  }, [def]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) =>
      def.searchKeys.some((k) => {
        const v = it[k];
        const str = Array.isArray(v) ? v.join(" ") : v == null ? "" : String(v);
        return str.toLowerCase().includes(needle);
      }),
    );
  }, [items, q, def]);

  const remove = async (it: WebItem) => {
    const name = String(it.title ?? it.name ?? it.author ?? it.id);
    if (!confirm(`Delete this ${def.singular}?\n\n${name}`)) return;
    try {
      await api.website.content.remove(def.key, def.idOf(it));
      setItems((prev) => prev.filter((x) => x.id !== it.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    }
  };

  const template = `${def.columns.map((c) => c.width).join(" ")} 96px`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: "var(--text-sub)" }}>{def.blurb}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", display: "flex" }}>
              <Icon d={I.search} size={12} />
            </span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${def.label.toLowerCase()}…`} style={{ paddingLeft: 30, width: 220 }} />
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setEditing("new")}>
              <Icon d={I.plus} size={13} /> New {def.singular}
            </button>
          )}
        </div>
      </div>

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      <div className="surface" style={{ overflow: "hidden" }}>
        <TableHead cols={[...def.columns.map((c) => c.label), ""]} template={template} />
        {loading && items.length === 0 ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty>{q ? "No matches." : `No ${def.label.toLowerCase()} yet.`}</Empty>
        ) : (
          filtered.map((it, i) => {
            const preview = def.previewPath?.(it);
            return (
              <div key={it.id} className="rt-row" style={rowStyle(template, i === 0)}>
                {def.columns.map((c) => (
                  <div key={c.key} data-label={c.label} style={{ minWidth: 0 }}>
                    {c.render ? c.render(it) : <span style={{ fontSize: 13, color: "var(--text)" }}>{String(it[c.key] ?? "")}</span>}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                  {preview && (
                    <a className="btn btn-ghost btn-icon" href={`${SITE_URL}${preview}`} target="_blank" rel="noreferrer" title="View on site">
                      <Icon d={I.eye} size={13} />
                    </a>
                  )}
                  {canEdit && (
                    <>
                      <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => setEditing(it)}>
                        <Icon d={I.edit} size={13} />
                      </button>
                      <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => void remove(it)} style={{ color: "var(--danger)" }}>
                        <Icon d={I.trash} size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <EditorModal
          def={def}
          items={items}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function EditorModal({ def, items, item, onClose, onSaved }: { def: CollectionDef; items: WebItem[]; item: WebItem | null; onClose: () => void; onSaved: () => void }) {
  const isNew = item === null;
  const [form, setForm] = useState<FormState>(() => toForm(item, def.fields, def.defaults));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const missing = missingRequired(form, def.fields);
    if (missing) {
      setErr(`${missing} is required.`);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      let payload = fromForm(form, def.fields);
      if (def.normalize) payload = def.normalize(payload, isNew);
      if (isNew) {
        const id = def.newId?.(payload, items);
        await api.website.content.create(def.key, { ...def.createExtras, ...payload, ...(id ? { id } : {}) });
      } else {
        await api.website.content.update(def.key, def.idOf(item), payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save");
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isNew ? `New ${def.singular}` : `Edit ${def.singular}`}
      subtitle={isNew ? def.blurb : `id · ${def.idOf(item)}`}
      onClose={onClose}
      width={680}
    >
      <FieldsForm fields={def.fields} form={form} setForm={setForm} disabled={busy} />
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 4 }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
          {busy ? "Saving…" : isNew ? `Create ${def.singular}` : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}
