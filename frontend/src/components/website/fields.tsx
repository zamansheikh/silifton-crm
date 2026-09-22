"use client";

import type { ReactNode } from "react";
import { ColorPicker } from "@/components/color-picker";
import { ImageField } from "./image-field";
import { Toggle, labelStyle } from "./ui";

// A small declarative form engine: each website collection and settings tab
// describes its fields once, and the same renderer/serializer handles them.

export type FieldType = "text" | "textarea" | "number" | "select" | "toggle" | "tags" | "image" | "color";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[] | ReadonlyArray<{ value: string | number; label: string }>;
  required?: boolean;
  placeholder?: string;
  half?: boolean;
  mono?: boolean;
  rows?: number;
  help?: string;
  aspect?: string;
  /** For image fields: where the Cloudinary public id is stored. */
  publicIdKey?: string;
  maxLength?: number;
  readOnly?: boolean;
}

export type FormState = Record<string, unknown>;

// Item → editable form (tags become a comma string, missing values get sane empties).
export function toForm(item: Record<string, unknown> | null, fields: FieldDef[], defaults: Record<string, unknown> = {}): FormState {
  const out: FormState = {};
  for (const f of fields) {
    const raw = item && item[f.key] !== undefined ? item[f.key] : defaults[f.key];
    switch (f.type) {
      case "tags":
        out[f.key] = Array.isArray(raw) ? (raw as unknown[]).join(", ") : typeof raw === "string" ? raw : "";
        break;
      case "toggle":
        out[f.key] = Boolean(raw);
        break;
      case "number":
        out[f.key] = raw === undefined || raw === null || raw === "" ? "" : String(raw);
        break;
      default:
        out[f.key] = raw === undefined || raw === null ? "" : raw;
    }
    if (f.type === "image" && f.publicIdKey) {
      out[f.publicIdKey] = item?.[f.publicIdKey] ?? "";
    }
  }
  return out;
}

// Form → API payload.
export function fromForm(form: FormState, fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = form[f.key];
    switch (f.type) {
      case "tags":
        out[f.key] = String(v ?? "").split(",").map((t) => t.trim()).filter(Boolean);
        break;
      case "number": {
        const n = Number(v);
        out[f.key] = v === "" || Number.isNaN(n) ? 0 : n;
        break;
      }
      case "toggle":
        out[f.key] = Boolean(v);
        break;
      case "select": {
        // Numeric selects (e.g. grid span) come back as strings from <select>.
        const opts = f.options ?? [];
        const numeric = opts.length > 0 && typeof (typeof opts[0] === "object" ? (opts[0] as { value: unknown }).value : opts[0]) === "number";
        out[f.key] = numeric ? Number(v) : String(v ?? "");
        break;
      }
      default:
        out[f.key] = typeof v === "string" ? v.trim() : v;
    }
    if (f.type === "image" && f.publicIdKey) {
      out[f.publicIdKey] = form[f.publicIdKey] || undefined;
      if (!out[f.key]) out[f.key] = undefined;
    }
  }
  return out;
}

export function missingRequired(form: FormState, fields: FieldDef[]): string | null {
  for (const f of fields) {
    if (!f.required) continue;
    const v = form[f.key];
    if (v === undefined || v === null || String(v).trim() === "") return f.label;
  }
  return null;
}

export function FieldsForm({
  fields,
  form,
  setForm,
  disabled,
}: {
  fields: FieldDef[];
  form: FormState;
  setForm: (next: FormState) => void;
  disabled?: boolean;
}) {
  const merge = (patch: FormState) => setForm({ ...form, ...patch });
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    // Pair consecutive half-width fields into a two-column row.
    if (f.half && fields[i + 1]?.half) {
      const g = fields[i + 1];
      nodes.push(
        <div key={f.key + g.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field key={f.key} f={f} form={form} merge={merge} disabled={disabled} />
          <Field key={g.key} f={g} form={form} merge={merge} disabled={disabled} />
        </div>,
      );
      i += 2;
    } else {
      nodes.push(<Field key={f.key} f={f} form={form} merge={merge} disabled={disabled} />);
      i += 1;
    }
  }
  return <>{nodes}</>;
}

function Field({ f, form, merge, disabled }: { f: FieldDef; form: FormState; merge: (patch: FormState) => void; disabled?: boolean }) {
  const v = form[f.key];
  const set = (k: string, val: unknown) => merge({ [k]: val });
  const label = (
    <label style={labelStyle}>
      {f.label}
      {f.required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
    </label>
  );
  const help = f.help ? <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{f.help}</div> : null;
  const ro = disabled || f.readOnly;

  switch (f.type) {
    case "image":
      return (
        <ImageField
          label={f.label}
          value={typeof v === "string" ? v : ""}
          aspect={f.aspect}
          help={f.help}
          disabled={ro}
          onChange={(url, publicId) => {
            const patch: FormState = { [f.key]: url };
            if (f.publicIdKey) patch[f.publicIdKey] = url ? publicId ?? "" : "";
            merge(patch);
          }}
        />
      );
    case "toggle":
      return (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{f.label}</div>
            {f.help && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{f.help}</div>}
          </div>
          <Toggle value={Boolean(v)} onChange={(x) => set(f.key, x)} disabled={ro} />
        </div>
      );
    case "color":
      return (
        <div style={{ marginBottom: 14 }}>
          {label}
          <ColorPicker value={typeof v === "string" && v ? v : "#a855f7"} onChange={(c) => set(f.key, c)} />
          {help}
        </div>
      );
    case "select":
      return (
        <div style={{ marginBottom: 14 }}>
          {label}
          <select className="input" value={String(v ?? "")} disabled={ro} onChange={(e) => set(f.key, e.target.value)}>
            {(f.options ?? []).map((o) => {
              const opt = typeof o === "object" ? o : { value: o, label: o };
              return <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>;
            })}
          </select>
          {help}
        </div>
      );
    case "textarea":
      return (
        <div style={{ marginBottom: 14 }}>
          {label}
          <textarea
            className="input"
            value={String(v ?? "")}
            disabled={ro}
            placeholder={f.placeholder}
            rows={f.rows ?? 4}
            onChange={(e) => set(f.key, e.target.value)}
            style={{ minHeight: (f.rows ?? 4) * 22 + 16, resize: "vertical", lineHeight: 1.5, fontFamily: f.mono ? "'Geist Mono', monospace" : undefined, fontSize: f.mono ? 12.5 : undefined }}
          />
          {help}
        </div>
      );
    case "number":
      return (
        <div style={{ marginBottom: 14 }}>
          {label}
          <input className="input" type="number" value={String(v ?? "")} disabled={ro} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
          {help}
        </div>
      );
    default:
      return (
        <div style={{ marginBottom: 14 }}>
          {label}
          <input
            className="input"
            value={String(v ?? "")}
            disabled={ro}
            placeholder={f.placeholder}
            maxLength={f.maxLength}
            onChange={(e) => set(f.key, e.target.value)}
            style={f.mono ? { fontFamily: "'Geist Mono', monospace" } : undefined}
          />
          {help}
        </div>
      );
  }
}
